import { describe, expect, it } from 'vitest';
import vectors from './text_vectors.json' with { type: 'json' };
import {
	codePointLength,
	normalizeName,
	normalizeNote,
	normalizeTicketId,
	type NormalizeResult
} from './normalize';

/**
 * One row of `text_vectors.json`. That file is generated from vynno-api
 * `internal/domain/testdata/text_vectors.json` by its `scripts/sync-contract`;
 * the Go tests run the same rows. An empty note, ticket or display name is `normalized: ""`
 * (for a display name that clears it, invisible-only input included: EMI-88 N2-04).
 */
type Vector = {
	name: string;
	kind: 'name' | 'note' | 'ticket' | 'displayName';
	input: string;
	normalized?: string;
	error?: string;
	reason?: 'invalid' | 'empty' | 'too_long';
};

function run(vector: Vector): NormalizeResult {
	if (vector.kind === 'name') return normalizeName(vector.input, { min: 1, max: 80 });
	if (vector.kind === 'displayName') return normalizeName(vector.input, { min: 0, max: 80 });
	if (vector.kind === 'note') return normalizeNote(vector.input);
	return normalizeTicketId(vector.input);
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
			if (vector.error) {
				expect(result.ok).toBe(false);
				if (!result.ok && vector.reason) expect(result.reason).toBe(vector.reason);
			} else {
				expect(result).toEqual({ ok: true, value: vector.normalized });
			}
		});
	}
});
