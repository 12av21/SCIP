// SCIP - Content Security Policy builder
// Isolated in its own module so it can be unit-tested without importing the
// full Express app (and its heavy Vite dependency).
//
// Clerk's browser SDK is served from, and communicates with, Clerk hosts, so
// script-src, connect-src and frame-src must allow them. Allowed hosts are:
//   1. the standard Clerk wildcard domains, plus
//   2. any hosts listed in CLERK_JS_HOSTS (comma-separated), plus
//   3. the host derived from the Clerk publishable key when present.

export function buildCsp(): string {
  const hosts = new Set<string>(['https://*.clerk.accounts.dev', 'https://*.clerk.com']);

  const extra = process.env.CLERK_JS_HOSTS || '';
  for (const h of extra.split(',').map((s) => s.trim()).filter(Boolean)) {
    hosts.add(h);
  }

  const pk = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (pk && pk.includes('_')) {
    try {
      const encoded = pk.split('_').slice(2).join('_');
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const host = decoded.split('$')[0].trim();
      if (host && /^[a-z0-9.-]+$/i.test(host)) hosts.add('https://' + host);
    } catch {
      // Ignore malformed key; the wildcard Clerk domains still apply.
    }
  }

  const allowed = [...hosts].join(' ');
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' ${allowed}`,
    `connect-src 'self' ${allowed}`,
    `frame-src ${allowed}`
  ].join('; ');
}