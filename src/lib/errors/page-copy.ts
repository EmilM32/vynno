import { m } from '$lib/paraglide/messages.js';

export type ErrorPageKind = 'not_found' | 'internal';

export type ErrorPageCopy = {
	kind: ErrorPageKind;
	retry: boolean;
	title: string;
	body: string;
	documentTitle: string;
};

/** Map an HTTP status to the route-level error page copy. */
export function errorPageCopy(status: number): ErrorPageCopy {
	if (status === 404) {
		const title = m.error_page_not_found_title();
		return {
			kind: 'not_found',
			retry: false,
			title,
			body: m.error_page_not_found_body(),
			documentTitle: title
		};
	}

	const title = m.error_page_internal_title();
	return {
		kind: 'internal',
		retry: true,
		title,
		body: m.error_page_internal_body(),
		documentTitle: title
	};
}
