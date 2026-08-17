import { env } from '$env/dynamic/public';

export const DEFAULT_API_BASE = 'http://localhost:8080/v1';

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
