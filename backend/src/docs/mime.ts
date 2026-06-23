export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/html': '.html',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/vnd.android.package-archive': '.apk',
};

const EXT_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive',
};

export function extFor(mime: string): string | null {
  return ALLOWED_MIME[mime] ?? null;
}

// Resolve to a canonical {mime, ext} from the client-reported type, falling back
// to the filename extension (clients often send octet-stream for .apk).
export function resolveType(
  mime: string,
  filename: string,
): { mime: string; ext: string } | null {
  if (ALLOWED_MIME[mime]) return { mime, ext: ALLOWED_MIME[mime] };
  const dot = filename.lastIndexOf('.');
  if (dot >= 0) {
    const ext = filename.slice(dot).toLowerCase();
    if (EXT_TO_MIME[ext]) return { mime: EXT_TO_MIME[ext], ext: ALLOWED_MIME[EXT_TO_MIME[ext]] };
  }
  return null;
}

// Types that can carry active content -> never serve as inline-trusted without hardening.
export function isActiveType(mime: string): boolean {
  return mime === 'text/html' || mime === 'image/svg+xml';
}

// Binary types served as a forced download rather than inline render.
export function isDownloadType(mime: string): boolean {
  return mime === 'application/vnd.android.package-archive';
}
