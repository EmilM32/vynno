import { jsonError } from '$lib/api/http';
import { logger } from './log';
import { REQUEST_ID_HEADER } from './request-log';

export const PROXY_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export type ProxyToApiInit = {
	request: Request;
	path: string;
	search: string;
	apiOrigin: string;
	requestId: string;
	/** From `event.getClientAddress()`. Replaces any browser-supplied forwarding header. */
	clientAddress: string;
	fetchFn?: typeof fetch;
};

function hopByHop(name: string): boolean {
	const lower = name.toLowerCase();
	return (
		lower === 'set-cookie' ||
		lower === 'transfer-encoding' ||
		lower === 'connection' ||
		lower === 'content-encoding'
	);
}

function isRejectedSegment(segment: string): boolean {
	if (segment === '' || segment === '.' || segment === '..') return true;
	if (segment.includes('\\') || segment.includes('%') || segment.includes('\0')) return true;
	for (const char of segment) {
		const cp = char.codePointAt(0)!;
		if (cp < 0x20 || cp === 0x7f) return true;
	}
	return false;
}

function upstreamUrl(apiOrigin: string, path: string, search: string): URL | null {
	const segments = path.split('/');
	if (segments.some(isRejectedSegment)) return null;
	try {
		const url = new URL(
			'/v1/' + segments.map((segment) => encodeURIComponent(segment)).join('/') + search,
			apiOrigin
		);
		if (url.origin !== new URL(apiOrigin).origin) return null;
		if (!url.pathname.startsWith('/v1/')) return null;
		return url;
	} catch {
		return null;
	}
}

/**
 * `ADDRESS_HEADER` makes `getClientAddress()` throw when the header is absent.
 * A missing address is loopback. `proxyToApi` still replaces any browser-supplied
 * `X-Forwarded-For` with whatever this returns.
 */
export function resolveClientAddress(getClientAddress: () => string): string {
	try {
		const address = getClientAddress();
		if (address) return address;
	} catch {
		// Header not present on this hop.
	}
	return '127.0.0.1';
}

/** True when Content-Length is a number above the documented 2 MiB body cap. */
export function proxyBodyExceedsLimit(contentLength: string | null): boolean {
	if (contentLength == null || contentLength === '') return false;
	const n = Number(contentLength);
	if (!Number.isFinite(n)) return false;
	return n > PROXY_BODY_LIMIT_BYTES;
}

function isBodyTooLarge(err: unknown): boolean {
	return (
		typeof err === 'object' &&
		err !== null &&
		'status' in err &&
		(err as { status: unknown }).status === 413
	);
}

function bodyTooLarge(): Response {
	return jsonError(413, 'invalid_body', 'Request body is too large.');
}

/** Same-origin `/v1` BFF. Upstream failure is 502, not an unhandled fetch throw. */
export async function proxyToApi({
	request,
	path,
	search,
	apiOrigin,
	requestId,
	clientAddress,
	fetchFn = fetch
}: ProxyToApiInit): Promise<Response> {
	const url = upstreamUrl(apiOrigin, path, search);
	if (!url) return jsonError(404, 'not_found', 'Not found.');

	if (proxyBodyExceedsLimit(request.headers.get('content-length'))) return bodyTooLarge();

	const headers = new Headers(request.headers);
	headers.delete('host');
	headers.delete('connection');
	headers.delete('x-forwarded-for');
	headers.delete('x-real-ip');
	headers.set('x-forwarded-for', clientAddress);
	headers.set(REQUEST_ID_HEADER, requestId);

	const init: RequestInit = {
		method: request.method,
		headers,
		redirect: 'manual'
	};
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		try {
			init.body = await request.arrayBuffer();
		} catch (err) {
			if (isBodyTooLarge(err)) return bodyTooLarge();
			throw err;
		}
	}

	let upstream: Response;
	try {
		upstream = await fetchFn(url, init);
	} catch (err) {
		logger.error('upstream', {
			err,
			method: request.method,
			path: `/v1/${path}`,
			request_id: requestId
		});
		return jsonError(502, 'upstream_unavailable', 'Upstream API is unavailable.');
	}

	const out = new Headers();
	for (const [key, value] of upstream.headers) {
		if (hopByHop(key)) continue;
		out.append(key, value);
	}
	for (const cookie of upstream.headers.getSetCookie()) {
		out.append('set-cookie', cookie);
	}

	return new Response(upstream.body, { status: upstream.status, headers: out });
}
