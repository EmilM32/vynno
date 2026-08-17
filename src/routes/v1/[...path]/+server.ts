import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const DEFAULT_API_ORIGIN = 'http://localhost:8080';

function apiOrigin(): string {
	return (env.API_ORIGIN ?? DEFAULT_API_ORIGIN).replace(/\/$/, '');
}

const proxy: RequestHandler = async ({ request, params, url }) => {
	const target = `${apiOrigin()}/v1/${params.path}${url.search}`;
	const headers = new Headers(request.headers);
	headers.delete('host');
	headers.delete('connection');

	const init: RequestInit = {
		method: request.method,
		headers,
		redirect: 'manual'
	};
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		init.body = await request.arrayBuffer();
	}

	const upstream = await fetch(target, init);
	const out = new Headers();
	for (const [key, value] of upstream.headers) {
		const lower = key.toLowerCase();
		if (
			lower === 'set-cookie' ||
			lower === 'transfer-encoding' ||
			lower === 'connection' ||
			lower === 'content-encoding'
		) {
			continue;
		}
		out.append(key, value);
	}
	for (const cookie of upstream.headers.getSetCookie()) {
		out.append('set-cookie', cookie);
	}

	return new Response(upstream.body, { status: upstream.status, headers: out });
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
