import { describe, expect, it } from 'vitest';
import { SESSION_BULK_PAGE_SIZE, SESSION_PAGE_SIZE } from './pagination';

describe('session page sizes', () => {
	it('keeps boot pages at 15 and bulk drains at the contract max', () => {
		expect(SESSION_PAGE_SIZE).toBe(15);
		expect(SESSION_BULK_PAGE_SIZE).toBe(100);
		expect(SESSION_BULK_PAGE_SIZE).toBeLessThanOrEqual(100);
	});
});
