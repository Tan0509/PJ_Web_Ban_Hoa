function stripTrailingSlash(v: string) {
  return v.replace(/\/+$/, '');
}

function guessBase(raw: string) {
  const v = raw.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  // If user provided host[:port] without protocol
  if (v.includes('localhost') || v.startsWith('127.') || v.startsWith('0.0.0.0')) return `http://${v}`;
  return `https://${v}`;
}

/**
 * Return site origin from NEXT_PUBLIC_SITE_URL, ignoring any path/query/hash.
 * Examples:
 * - "http://localhost:3000/orders" -> "http://localhost:3000"
 * - "https://example.com" -> "https://example.com"
 */
export function getEnvSiteOrigin() {
  const raw = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!raw) return '';
  try {
    return new URL(guessBase(raw)).origin;
  } catch {
    // Fallback: best-effort, but still avoid trailing slashes
    return stripTrailingSlash(raw);
  }
}

