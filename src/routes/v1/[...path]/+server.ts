import { getApiOrigin } from '$lib/server/env';
import { proxyToApi } from '$lib/server/proxy';
import type { RequestHandler } from './$types';

const proxy: RequestHandler = async ({ request, params, url, locals }) => {
	return proxyToApi({
		request,
		path: params.path,
		search: url.search,
		apiOrigin: getApiOrigin(),
		requestId: locals.requestId
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
