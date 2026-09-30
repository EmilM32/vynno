import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/errors';
import type { DayTotal } from '$lib/types/domain';
import { DayTotalsQuery } from './day-totals.svelte';

const week = { from: '2026-03-23', to: '2026-03-29', timeZone: 'UTC' };
const month = { from: '2026-03-01', to: '2026-03-31', timeZone: 'UTC' };
const row = (durationMs: number): DayTotal => ({
	date: '2026-03-24',
	projectId: 'p',
	durationMs,
	sessionCount: 1
});

function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('DayTotalsQuery', () => {
	it('keeps the last rows while another range loads', async () => {
		const query = new DayTotalsQuery();
		await query.load(week, async () => [row(1)]);
		expect(query.isFor(week)).toBe(true);

		const next = deferred<DayTotal[]>();
		const loading = query.load(month, () => next.promise);
		expect(query.loading).toBe(true);
		expect(query.rows).toEqual([row(1)]);
		expect(query.isFor(month)).toBe(false);

		next.resolve([row(2)]);
		await loading;
		expect(query.isFor(month)).toBe(true);
		expect(query.rows).toEqual([row(2)]);
		expect(query.loading).toBe(false);
	});

	it('drops a reply that a newer load superseded', async () => {
		const query = new DayTotalsQuery();
		const slow = deferred<DayTotal[]>();
		const first = query.load(week, () => slow.promise);
		await query.load(month, async () => [row(2)]);
		slow.resolve([row(1)]);
		await first;
		expect(query.isFor(month)).toBe(true);
		expect(query.rows).toEqual([row(2)]);
	});

	it('reports an error and keeps the rows it had', async () => {
		const query = new DayTotalsQuery();
		await query.load(week, async () => [row(1)]);
		await query.load(week, async () => {
			throw new ApiError(400, 'invalid_query', 'bad');
		});
		expect(query.error).not.toBeNull();
		expect(query.rows).toEqual([row(1)]);
		expect(query.loading).toBe(false);
	});
});
