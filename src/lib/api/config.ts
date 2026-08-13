import { env } from '$env/dynamic/public';

export const DEFAULT_API_BASE = '/mock/v1';

/** Public API origin + version prefix. No trailing slash. */
export function getApiBase(override?: string): string {
	const raw = override ?? env.PUBLIC_API_BASE ?? DEFAULT_API_BASE;
	return raw.replace(/\/$/, '');
}

export function isMockApi(base = getApiBase()): boolean {
	return base === DEFAULT_API_BASE || base.startsWith('/mock/');
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
