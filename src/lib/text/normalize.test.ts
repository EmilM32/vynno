import { describe, expect, it } from 'vitest';
import vectors from './text_vectors.json' with { type: 'json' };
import {
	codePointLength,
	normalizeName,
	normalizeNote,
	normalizeTicketId,
	type NormalizeResult
} from './normalize';

type Vector = {
	name: string;
	fn: 'normalizeName' | 'normalizeNote' | 'normalizeTicketId';
	raw: string;
	min?: number;
	max?: number;
	ok: boolean;
	value?: string;
	reason?: 'invalid' | 'empty' | 'too_long';
};

function run(vector: Vector): NormalizeResult {
	if (vector.fn === 'normalizeName') {
		return normalizeName(vector.raw, { min: vector.min ?? 1, max: vector.max ?? 80 });
	}
	if (vector.fn === 'normalizeNote') return normalizeNote(vector.raw);
	return normalizeTicketId(vector.raw);
}

describe('codePointLength', () => {
	it('counts emoji as one', () => {
		expect(codePointLength('😀')).toBe(1);
		expect(codePointLength('😀'.repeat(80))).toBe(80);
	});
});

describe('text vectors', () => {
	for (const vector of vectors as Vector[]) {
		it(vector.name, () => {
			const result = run(vector);
			if (vector.ok) {
				expect(result).toEqual({ ok: true, value: vector.value });
			} else {
				expect(result.ok).toBe(false);
				if (!result.ok && vector.reason) expect(result.reason).toBe(vector.reason);
			}
		});
	}
});
