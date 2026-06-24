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
import { Document } from '@/db/schema';

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

  @Get()
  async index(@Req() req: Request, @Res() res: Response) {
    const tenant = req.tenant!;

    const token = (req as any).cookies?.[READER_COOKIE];
    const isReader = !!token && this.auth.verifyReader(token, tenant.id);

    const all = await this.docs.listByTenant(tenant.id);
    const visible = all
      .filter((d) => d.isPublic || isReader)
      .sort((a, b) => (a.title ?? a.slug).localeCompare(b.title ?? b.slug));
    const lockedCount = all.filter((d) => !d.isPublic).length;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    );
    res.send(renderIndex(tenant.name, visible, isReader, lockedCount));
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

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderIndex(
  tenantName: string,
  docs: Document[],
  isReader: boolean,
  lockedCount: number,
): string {
  const rows = docs
    .map((d) => {
      const label = esc(d.title ?? d.slug);
      const lock = d.isPublic ? '' : ' <span class="lock" title="restringido">🔒</span>';
      return `<li><a href="/${esc(d.slug)}">${label}</a>${lock}<span class="meta">${esc(
        d.contentType,
      )} · ${fmtSize(d.sizeBytes)}</span></li>`;
    })
    .join('\n');

  const empty = docs.length === 0 ? '<p class="empty">No hay documentos disponibles.</p>' : '';
  const lockedNote =
    !isReader && lockedCount > 0
      ? `<p class="note">${lockedCount} documento(s) restringido(s). <a href="/unlock">Desbloquear</a> para verlos.</p>`
      : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tenantName)} · Documentos</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 680px; margin: 3rem auto; padding: 0 1.25rem; }
  h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
  ul { list-style: none; padding: 0; }
  li { display: flex; align-items: baseline; gap: .5rem; padding: .65rem 0; border-bottom: 1px solid #8884; }
  a { text-decoration: none; }
  a:hover { text-decoration: underline; }
  .meta { margin-left: auto; font-size: .8rem; opacity: .6; }
  .lock { font-size: .85rem; }
  .note, .empty { opacity: .7; font-size: .9rem; }
</style>
</head>
<body>
<h1>${esc(tenantName)}</h1>
${lockedNote}
${empty}
<ul>
${rows}
</ul>
</body>
</html>`;
}
