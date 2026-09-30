import { describe, expect, it } from 'vitest';
import { foldForSearch, fuzzyScore } from './fuzzy';

describe('foldForSearch', () => {
	it('drops case and accents, including Polish ł', () => {
		expect(foldForSearch('Żółw ŁÓDŹ')).toBe('zolw lodz');
	});
});

describe('fuzzyScore', () => {
	it('matches everything for an empty query', () => {
		expect(fuzzyScore('  ', 'Go to Logs')).toBe(0);
	});

	it('matches a substring regardless of case and accents', () => {
		expect(fuzzyScore('LOGS', 'Go to Logs')).not.toBeNull();
		expect(fuzzyScore('zadanie', 'Żądanie')).not.toBeNull();
	});

	it('matches initials as a subsequence that starts a word', () => {
		expect(fuzzyScore('gtl', 'Go to Logs')).not.toBeNull();
		expect(fuzzyScore('ogs', 'Go to Logs')).not.toBeNull();
	});

	it('rejects a subsequence that starts mid-word', () => {
		expect(fuzzyScore('oo', 'Go to Logs')).toBeNull();
	});

	it('rejects text missing a letter', () => {
		expect(fuzzyScore('xyz', 'Go to Logs')).toBeNull();
	});

	it('needs every token to match', () => {
		expect(fuzzyScore('auth refactor', 'Refactor AUTH service')).not.toBeNull();
		expect(fuzzyScore('auth billing', 'Refactor AUTH service')).toBeNull();
	});

	it('ranks a word-start substring above a mid-word one, and both above initials', () => {
		const wordStart = fuzzyScore('log', 'Go to Logs')!;
		const midWord = fuzzyScore('log', 'Catalog')!;
		const initials = fuzzyScore('gtl', 'Go to Logs')!;
		expect(wordStart).toBeGreaterThan(midWord);
		expect(midWord).toBeGreaterThan(initials);
	});
});
