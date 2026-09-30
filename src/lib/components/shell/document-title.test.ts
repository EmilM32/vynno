import { describe, expect, it } from 'vitest';
import { documentTitle } from './document-title';

describe('documentTitle', () => {
	it('names the screen while idle', () => {
		expect(documentTitle('Timer', null)).toBe('Timer · Vynno');
	});

	it('leads with the clock and task while live', () => {
		expect(documentTitle('Timer', { clock: '01:23:45', task: 'Refactor auth' })).toBe(
			'▶ 01:23:45 · Refactor auth · Vynno'
		);
	});
});
