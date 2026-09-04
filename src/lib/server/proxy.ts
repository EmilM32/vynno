import { jsonError } from '$lib/api/http';
import { logger } from './log';
import { REQUEST_ID_HEADER } from './request-log';

export type ProxyToApiInit = {
	request: Request;
	path: string;
	search: string;
	apiOrigin: string;
	requestId: string;
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

/** Same-origin `/v1` BFF. Upstream failure is 502, not an unhandled fetch throw. */
export async function proxyToApi({
	request,
	path,
	search,
	apiOrigin,
	requestId,
	fetchFn = fetch
}: ProxyToApiInit): Promise<Response> {
	const target = `${apiOrigin}/v1/${path}${search}`;
	const headers = new Headers(request.headers);
	headers.delete('host');
	headers.delete('connection');
	headers.set(REQUEST_ID_HEADER, requestId);

	const init: RequestInit = {
		method: request.method,
		headers,
		redirect: 'manual'
	};
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		init.body = await request.arrayBuffer();
	}

	let upstream: Response;
	try {
		upstream = await fetchFn(target, init);
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
