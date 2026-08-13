import { describe, expect, it } from 'vitest';
import { getFocusable } from './focus-trap';

describe('getFocusable', () => {
	it('returns an empty list for an empty container', () => {
		// jsdom is not the Vitest environment — exercise the filter on a stub.
		const container = {
			querySelectorAll: () => []
		} as unknown as HTMLElement;
		expect(getFocusable(container)).toEqual([]);
	});
});
