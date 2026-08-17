import { env } from '$env/dynamic/public';

/** Same-origin prefix; Kit proxies `/v1` to vynno-api so the session cookie is first-party. */
export const DEFAULT_API_BASE = '/v1';

/** Public API origin + version prefix. No trailing slash. */
export function getApiBase(override?: string): string {
	const raw = override ?? env.PUBLIC_API_BASE ?? DEFAULT_API_BASE;
	return raw.replace(/\/$/, '');
}

/** Resolve a contract path (`/projects`) against the configured base. */
export function apiUrl(path: string, base = getApiBase()): string {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	if (/^https?:\/\//.test(base)) {
		return `${base}${normalized}`;
	}
	const prefix = base.startsWith('/') ? base : `/${base}`;
	return `${prefix}${normalized}`;
}

/** True when `url` is a request to the configured vynno-api origin. */
export function isVynnoApiUrl(url: string, base = getApiBase()): boolean {
	try {
		if (base.startsWith('/')) {
			const path = new URL(url).pathname;
			const prefix = base.endsWith('/') ? base : `${base}/`;
			return path === base || path.startsWith(prefix);
		}
		const origin = new URL(base).origin;
		return url.startsWith(origin);
	} catch {
		return false;
	}
}

/** Session cookie name set by vynno-api. */
export const SESSION_COOKIE = 'vynno_session';
