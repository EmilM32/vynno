import type { Handle, HandleFetch } from '@sveltejs/kit';
import { getApiBase, isVynnoApiUrl } from '$lib/api/config';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = handleParaglide;

/**
 * Kit only auto-forwards cookies to the app origin (or a subdomain of it).
 * If `PUBLIC_API_BASE` is an absolute vynno-api origin, copy Cookie / Authorization.
 */
export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
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
