import { describe, expect, it } from 'vitest';
import { activityChipClass } from './activity-styles';

describe('activityChipClass', () => {
	it('pairs container fills with on-container ink (solid, not washed)', () => {
		expect(activityChipClass('primary-container')).toBe(
			'bg-primary-container text-on-primary-container border-primary-container'
		);
		expect(activityChipClass('secondary-container')).toBe(
			'bg-secondary-container text-on-secondary-container border-secondary-container'
		);
	});

	it('falls back to outline for unknown tokens', () => {
		expect(activityChipClass('not-a-token')).toBe(activityChipClass('outline'));
	});
});
