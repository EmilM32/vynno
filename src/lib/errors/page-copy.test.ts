import { describe, expect, it } from 'vitest';
import { errorPageCopy } from './page-copy';

describe('errorPageCopy', () => {
	it('treats 404 as a missing path, not a failure', () => {
		expect(errorPageCopy(404)).toEqual({
			kind: 'not_found',
			retry: false,
			title: 'Page not found',
			body: "That path isn't a Vynno screen.",
			documentTitle: 'Page not found'
		});
	});

	it('treats 5xx as an internal failure with retry', () => {
		expect(errorPageCopy(500)).toMatchObject({
			kind: 'internal',
			retry: true,
			title: 'Something went wrong',
			documentTitle: 'Something went wrong'
		});
		expect(errorPageCopy(502).kind).toBe('internal');
	});

	it('treats other statuses as internal', () => {
		expect(errorPageCopy(403).kind).toBe('internal');
		expect(errorPageCopy(418).retry).toBe(true);
	});
});
