export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  return parsed.href;
}

export function isSameOrigin(url: URL, baseHostname: string): boolean {
  return url.hostname === baseHostname;
}
