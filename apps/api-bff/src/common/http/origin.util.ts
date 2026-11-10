const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isAllowedOrigin(
  origin: string,
  configuredOrigins: readonly string[],
  isDevelopment: boolean,
): boolean {
  if (configuredOrigins.includes(origin)) return true;
  if (!isDevelopment) return false;

  try {
    const url = new URL(origin);
    if (LOCAL_HOSTNAMES.has(url.hostname)) return true;
    return (
      url.protocol === 'https:' && url.hostname.endsWith('.trycloudflare.com')
    );
  } catch {
    return false;
  }
}
