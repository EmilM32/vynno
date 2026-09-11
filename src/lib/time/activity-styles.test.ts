import { describe, expect, it } from 'vitest';
import { activityChipClass, activityColorLabel, activitySwatchClass } from './activity-styles';

describe('activityChipClass', () => {
	it('washes container tokens as indigo / coral (Family recipe)', () => {
		expect(activityChipClass('primary-container')).toBe(
			'bg-indigo/10 text-indigo border-indigo/20'
		);
		expect(activityChipClass('secondary-container')).toBe('bg-coral/10 text-coral border-coral/20');
	});

	it('falls back to outline for unknown tokens', () => {
		expect(activityChipClass('not-a-token')).toBe(activityChipClass('outline'));
	});
});

describe('activityColorLabel', () => {
	it('names container tokens as indigo / coral', () => {
		expect(activityColorLabel('primary-container')).toBe('indigo');
		expect(activityColorLabel('secondary-container')).toBe('coral');
		expect(activityColorLabel('primary')).toBe('primary');
	});
});

describe('activitySwatchClass', () => {
	it('fills container swatches with indigo / coral', () => {
		expect(activitySwatchClass('primary-container')).toBe('bg-indigo');
		expect(activitySwatchClass('secondary-container')).toBe('bg-coral');
	});
});
