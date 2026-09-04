import { dev } from '$app/environment';
import type { Handle, HandleFetch, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getApiBase, isVynnoApiUrl } from '$lib/api/config';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { logger } from '$lib/server/log';
import {
	REQUEST_ID_HEADER,
	requestLoggingEnabled,
	resolveRequestId,
	shouldLogRequest
} from '$lib/server/request-log';

const handleRequestId: Handle = async ({ event, resolve }) => {
	event.locals.requestId = resolveRequestId(event.request.headers.get(REQUEST_ID_HEADER));
	const response = await resolve(event);
	try {
		response.headers.set(REQUEST_ID_HEADER, event.locals.requestId);
		return response;
	} catch {
		const headers = new Headers(response.headers);
		headers.set(REQUEST_ID_HEADER, event.locals.requestId);
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	}
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale)),
			preload: ({ type }) => type === 'js' || type === 'css' || type === 'font'
		});
	});

const handleRequestLog: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const response = await resolve(event);
	if (requestLoggingEnabled() && shouldLogRequest(event.url.pathname, response.status)) {
		const fields = {
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			ms: Date.now() - start,
			request_id: event.locals.requestId
		};
		if (response.status >= 500) {
			logger.error('request', fields);
		} else {
			logger.info('request', fields);
		}
	}
	return response;
};

export const handle: Handle = sequence(handleRequestId, handleParaglide, handleRequestLog);

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	if (dev) {
		console.error(error);
	} else if (status >= 500) {
		logger.error('handler', {
			err: error,
			status,
			method: event.request.method,
			path: event.url.pathname,
			request_id: event.locals.requestId
		});
	}
	return { message };
};

/**
 * Kit only auto-forwards cookies to the app origin (or a subdomain of it).
 * If `PUBLIC_API_BASE` is an absolute vynno-api origin, copy Cookie / Authorization.
 */
export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
	if (event.locals.requestId && !request.headers.has(REQUEST_ID_HEADER)) {
		request.headers.set(REQUEST_ID_HEADER, event.locals.requestId);
	}
	if (isVynnoApiUrl(request.url, getApiBase())) {
		const cookie = event.request.headers.get('cookie');
		if (cookie) request.headers.set('cookie', cookie);
		const authorization = event.request.headers.get('authorization');
		if (authorization && !request.headers.has('authorization')) {
			request.headers.set('authorization', authorization);
		}
	}
	return fetch(request);
};
