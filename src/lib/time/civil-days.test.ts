import { describe, expect, it } from 'vitest';
import { isoWeekNumber } from './civil-days';

describe('isoWeekNumber', () => {
	it('numbers a mid-year week', () => {
		expect(isoWeekNumber('2026-11-03')).toBe(45);
	});

	it('puts early January in the previous year when the week starts there', () => {
		expect(isoWeekNumber('2027-01-01')).toBe(53);
		expect(isoWeekNumber('2021-01-03')).toBe(53);
	});

	it('puts late December in week 1 when that week holds January’s first Thursday', () => {
		expect(isoWeekNumber('2024-12-30')).toBe(1);
		expect(isoWeekNumber('2026-01-01')).toBe(1);
	});

	it('keeps Monday through Sunday in one week', () => {
		expect(isoWeekNumber('2026-11-02')).toBe(45);
		expect(isoWeekNumber('2026-11-08')).toBe(45);
		expect(isoWeekNumber('2026-11-09')).toBe(46);
	});
});
