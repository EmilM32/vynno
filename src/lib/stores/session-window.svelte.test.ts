import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/errors';
import { makeSession } from '$lib/test/factories';
import type { TimeSession } from '$lib/types/domain';
import { SessionWindowQuery } from './session-window.svelte';

const week = { from: '2026-03-22T23:00:00.000Z', to: '2026-03-29T22:00:00.000Z' };
const month = { from: '2026-02-28T23:00:00.000Z', to: '2026-03-31T22:00:00.000Z' };
const one = makeSession({ id: 'a' });
const two = makeSession({ id: 'b' });

function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('SessionWindowQuery', () => {
	it('keeps the last sessions while another window loads', async () => {
		const query = new SessionWindowQuery();
		await query.load(week, async () => [one]);
		expect(query.isFor(week)).toBe(true);

		const next = deferred<TimeSession[]>();
		const loading = query.load(month, () => next.promise);
		expect(query.loading).toBe(true);
		expect(query.sessions).toEqual([one]);
		expect(query.isFor(month)).toBe(false);

		next.resolve([two]);
		await loading;
		expect(query.isFor(month)).toBe(true);
		expect(query.sessions).toEqual([two]);
		expect(query.loading).toBe(false);
	});

	it('drops a reply that a newer load superseded', async () => {
		const query = new SessionWindowQuery();
		const slow = deferred<TimeSession[]>();
		const first = query.load(week, () => slow.promise);
		await query.load(month, async () => [two]);
		slow.resolve([one]);
		await first;
		expect(query.isFor(month)).toBe(true);
		expect(query.sessions).toEqual([two]);
	});

	it('reports an error and keeps the sessions it had', async () => {
		const query = new SessionWindowQuery();
		await query.load(week, async () => [one]);
		await query.load(week, async () => {
			throw new ApiError(400, 'invalid_query', 'bad');
		});
		expect(query.error).not.toBeNull();
		expect(query.sessions).toEqual([one]);
		expect(query.loading).toBe(false);
	});
});
