import { describe, expect, it } from 'vitest';
import { weekLoggedLabel } from './week-logged';

describe('weekLoggedLabel', () => {
	it('never renders 0s', () => {
		expect(weekLoggedLabel(0)).toBe('Nothing logged this week');
		expect(weekLoggedLabel(400)).toBe('<1s logged this week');
		expect(weekLoggedLabel(5_000)).toBe('5s logged this week');
	});
});
