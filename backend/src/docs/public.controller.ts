import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DocsService } from '@/docs/docs.service';
import { AuthService } from '@/auth/auth.service';
import { UnlockDto } from '@/docs/dto';
import { StorageService } from '@/docs/storage.service';
import { isActiveType, isDownloadType, ALLOWED_MIME } from '@/docs/mime';

const READER_COOKIE = 'reader_session';

@Controller()
export class PublicController {
  constructor(
    private docs: DocsService,
    private auth: AuthService,
    private storage: StorageService,
  ) {}

  @Post('unlock')
  async unlock(@Req() req: Request, @Res() res: Response, @Body() body: UnlockDto) {
    const tenant = req.tenant!;
    const token = await this.auth.unlock(tenant.accessHash, body.password, tenant.id);
    res.cookie(READER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    });
    return res.json({ ok: true });
  }

  @Get('healthz')
  health(@Req() req: Request) {
    return { ok: true, tenant: req.tenant!.key };
  }

  @Get(':slug')
  async serve(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    const tenant = req.tenant!;
    const doc = await this.docs.findBySlug(tenant.id, slug);
    if (!doc) throw new NotFoundException('document not found');

    if (!doc.isPublic) {
      const token = (req as any).cookies?.[READER_COOKIE];
      if (!token || !this.auth.verifyReader(token, tenant.id)) {
        throw new UnauthorizedException('credential required');
      }
    }

    res.setHeader('Content-Type', doc.contentType);
    res.setHeader('Content-Length', doc.sizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=60');

    if (isActiveType(doc.contentType)) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      );
    }
    const ext = ALLOWED_MIME[doc.contentType] ?? '';
    const disposition = isDownloadType(doc.contentType) ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${slug}${ext}"`);

    this.storage.stream(tenant.key, doc.fileName).pipe(res);
  }
}
