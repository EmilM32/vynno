import { getApiOrigin } from '$lib/server/env';
import { proxyToApi, resolveClientAddress } from '$lib/server/proxy';
import type { RequestHandler } from './$types';

const proxy: RequestHandler = async (event) => {
	return proxyToApi({
		request: event.request,
		path: event.params.path,
		search: event.url.search,
		apiOrigin: getApiOrigin(),
		requestId: event.locals.requestId,
		clientAddress: resolveClientAddress(() => event.getClientAddress())
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
