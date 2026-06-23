import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '@/auth/admin.guard';
import { AuthService } from '@/auth/auth.service';
import { DocsService } from '@/docs/docs.service';
import { TenantsService } from '@/docs/tenants.service';
import { CreateDocDto, UpdateDocDto, LoginDto, TenantDto, CredentialDto } from '@/docs/dto';
import { extFor } from '@/docs/mime';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? 50);
const uploadOpts = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
};

@Controller('admin/api')
export class AdminController {
  constructor(
    private auth: AuthService,
    private docs: DocsService,
    private tenants: TenantsService,
  ) {}

  @Post('login')
  async login(@Res() res: Response, @Body() body: LoginDto) {
    const token = await this.auth.adminLogin(body.user, body.password);
    res.cookie('admin_session', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });
    return res.json({ token });
  }

  // ---- tenants ----
  @UseGuards(AdminGuard)
  @Get('tenants')
  listTenants() {
    return this.tenants.list();
  }

  @UseGuards(AdminGuard)
  @Post('tenants')
  createTenant(@Body() body: TenantDto) {
    return this.tenants.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('tenants/:id/credential')
  async setCredential(@Param('id', ParseIntPipe) id: number, @Body() body: CredentialDto) {
    await this.tenants.setCredential(id, body.password);
    return { ok: true };
  }

  @UseGuards(AdminGuard)
  @Delete('tenants/:id/credential')
  async clearCredential(@Param('id', ParseIntPipe) id: number) {
    await this.tenants.clearCredential(id);
    return { ok: true };
  }

  // ---- documents ----
  @UseGuards(AdminGuard)
  @Get('docs')
  listDocs(@Query('tenantId') tenantId?: string) {
    return tenantId ? this.docs.listByTenant(Number(tenantId)) : this.docs.listAll();
  }

  @UseGuards(AdminGuard)
  @Post('docs')
  @UseInterceptors(FileInterceptor('file', uploadOpts))
  async createDoc(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateDocDto & { tenantId: string },
  ) {
    if (!file) throw new BadRequestException('file required');
    const ext = extFor(file.mimetype);
    if (!ext) throw new BadRequestException(`unsupported type: ${file.mimetype}`);
    const tenant = await this.tenants.getById(Number(body.tenantId));
    return this.docs.create({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      slug: body.slug,
      title: body.title,
      isPublic: body.isPublic ?? true,
      contentType: file.mimetype,
      buffer: file.buffer,
      ext,
    });
  }

  @UseGuards(AdminGuard)
  @Put('docs/:id')
  @UseInterceptors(FileInterceptor('file', uploadOpts))
  async updateDoc(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UpdateDocDto,
  ) {
    const doc = await this.docs.getById(id);
    const tenant = await this.tenants.getById(doc.tenantId);

    if (Object.keys(body).length) {
      await this.docs.updateMeta(id, {
        slug: body.slug,
        title: body.title,
        isPublic: body.isPublic,
      });
    }
    if (file) {
      const ext = extFor(file.mimetype);
      if (!ext) throw new BadRequestException(`unsupported type: ${file.mimetype}`);
      return this.docs.replaceFile(id, tenant.key, file.mimetype, file.buffer, ext);
    }
    return this.docs.getById(id);
  }

  @UseGuards(AdminGuard)
  @Delete('docs/:id')
  async deleteDoc(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.docs.getById(id);
    const tenant = await this.tenants.getById(doc.tenantId);
    await this.docs.remove(id, tenant.key);
    return { ok: true };
  }
}
