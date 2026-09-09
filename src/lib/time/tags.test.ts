import { describe, expect, it } from 'vitest';
import { formatTags, parseTags, tagsEqual } from './tags';

describe('parseTags', () => {
	it('splits, trims, and de-dupes', () => {
		expect(parseTags(' focus, backend, focus ')).toEqual(['focus', 'backend']);
	});

	it('returns empty for blank input', () => {
		expect(parseTags('  ,  ')).toEqual([]);
		expect(parseTags('')).toEqual([]);
	});
});

describe('formatTags / tagsEqual', () => {
	it('round-trips', () => {
		expect(formatTags(['focus', 'backend'])).toBe('focus, backend');
		expect(formatTags(undefined)).toBe('');
	});

	it('compares missing with empty', () => {
		expect(tagsEqual(undefined, [])).toBe(true);
		expect(tagsEqual(['a'], ['a'])).toBe(true);
		expect(tagsEqual(['a'], ['b'])).toBe(false);
	});
});
