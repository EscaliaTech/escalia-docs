export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/html': '.html',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

export function extFor(mime: string): string | null {
  return ALLOWED_MIME[mime] ?? null;
}

// Types that can carry active content -> never serve as inline-trusted without hardening.
export function isActiveType(mime: string): boolean {
  return mime === 'text/html' || mime === 'image/svg+xml';
}
