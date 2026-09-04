/** Shared by Caddy, this process, and vynno-api. */
export const REQUEST_ID_HEADER = 'x-request-id';

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;

export function resolveRequestId(header: string | null | undefined): string {
	const value = header?.trim();
	if (value && REQUEST_ID_RE.test(value)) return value;
	return crypto.randomUUID();
}

/** Production request lines, or when LOG_FORMAT=json (matches vynno-api). */
export function requestLoggingEnabled(
	nodeEnv = process.env.NODE_ENV,
	logFormat = process.env.LOG_FORMAT
): boolean {
	return nodeEnv === 'production' || logFormat === 'json';
}

/**
 * Skip hashed static and liveness. Always keep /v1 and any 4xx/5xx.
 * HTML navigations are info; fonts live under /_app/ and stay quiet.
 */
export function shouldLogRequest(pathname: string, status: number): boolean {
	if (status >= 400) return true;
	if (pathname === '/healthz') return false;
	if (pathname === '/v1' || pathname.startsWith('/v1/')) return true;
	if (pathname.startsWith('/_app/')) return false;
	if (pathname === '/robots.txt' || pathname === '/favicon.svg' || pathname === '/favicon.ico') {
		return false;
	}
	return true;
}
