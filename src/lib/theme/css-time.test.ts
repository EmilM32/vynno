import { describe, expect, it } from 'vitest';
import { cssTimeToMs } from './css-time';

describe('cssTimeToMs', () => {
	it('reads milliseconds', () => {
		expect(cssTimeToMs('150ms')).toBe(150);
	});

	it('reads the minified seconds form', () => {
		expect(cssTimeToMs('.15s')).toBe(150);
		expect(cssTimeToMs(' 0.2s ')).toBe(200);
	});

	it('rejects empty and unitless values', () => {
		expect(cssTimeToMs('')).toBeNull();
		expect(cssTimeToMs('150')).toBeNull();
	});
});
