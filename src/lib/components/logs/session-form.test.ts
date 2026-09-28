import { describe, expect, it } from 'vitest';
import { makeSession } from '$lib/test/factories';
import { isoToDatetimeLocal } from '$lib/time/duration';
import { buildSessionSubmit, type SessionFormValues } from './session-form';

const NOW = Date.parse('2026-09-28T12:00:00.000Z');
const HOUR = 60 * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();
const local = (ms: number) => isoToDatetimeLocal(iso(ms));

function values(overrides: Partial<SessionFormValues> = {}): SessionFormValues {
	return {
		note: 'Review',
		projectId: 'proj-a',
		activityTypeId: '',
		ticketId: '',
		startedLocal: local(NOW - 2 * HOUR),
		endedLocal: local(NOW - HOUR),
		...overrides
	};
}

function create(overrides: Partial<SessionFormValues> = {}) {
	return buildSessionSubmit({ mode: 'create', values: values(overrides), nowMs: NOW });
}

describe('buildSessionSubmit create', () => {
	it('builds a manual session body', () => {
		const result = create({ ticketId: 'DEV-1', activityTypeId: 'act-1' });
		expect(result).toEqual({
			kind: 'create',
			input: {
				projectId: 'proj-a',
				note: 'Review',
				activityTypeId: 'act-1',
				ticketId: 'DEV-1',
				startedAt: iso(NOW - 2 * HOUR),
				endedAt: iso(NOW - HOUR)
			}
		});
	});

	it.each([
		['tomorrow', NOW + 20 * HOUR, NOW + 21 * HOUR, 'in_future'],
		[
			'before 2000',
			Date.parse('1999-12-31T10:00:00Z'),
			Date.parse('1999-12-31T11:00:00Z'),
			'before_min'
		],
		['longer than 7 days', NOW - 8 * 24 * HOUR, NOW - HOUR, 'too_long'],
		['end before start', NOW - HOUR, NOW - 2 * HOUR, 'end_before_start']
	] as const)('rejects %s', (_label, started, ended, reason) => {
		const result = create({ startedLocal: local(started), endedLocal: local(ended) });
		expect(result).toEqual({
			kind: 'invalid',
			errors: { time: reason, note: null, ticket: null }
		});
	});

	it('rejects an empty time field', () => {
		expect(create({ endedLocal: '' })).toMatchObject({ errors: { time: 'invalid' } });
	});

	it('reports note and ticket limits together with a time error', () => {
		const result = create({
			note: 'n'.repeat(501),
			ticketId: 't'.repeat(65),
			endedLocal: local(NOW + 2 * HOUR)
		});
		expect(result).toEqual({
			kind: 'invalid',
			errors: { time: 'in_future', note: 'too_long', ticket: 'too_long' }
		});
	});

	it('accepts the note and ticket at their limits', () => {
		expect(create({ note: 'n'.repeat(500), ticketId: 't'.repeat(64) }).kind).toBe('create');
	});
});

describe('buildSessionSubmit edit', () => {
	const stopped = makeSession({
		id: 'old',
		note: 'Old note',
		ticketId: 'DEV-2',
		status: 'stopped',
		startedAt: '2026-09-28T08:00:30.500Z',
		endedAt: '2026-09-28T09:15:45.250Z'
	});

	function edit(session = stopped, overrides: Partial<SessionFormValues> = {}) {
		return buildSessionSubmit({
			mode: 'edit',
			session,
			nowMs: NOW,
			values: values({
				note: session.note,
				ticketId: session.ticketId ?? '',
				startedLocal: isoToDatetimeLocal(session.startedAt),
				endedLocal: isoToDatetimeLocal(session.endedAt ?? ''),
				...overrides
			})
		});
	}

	it('omits unchanged instants so seconds are not rounded away', () => {
		const result = edit(stopped, { note: 'New note' });
		expect(result).toEqual({
			kind: 'update',
			input: { projectId: 'proj-a', activityTypeId: null, note: 'New note', ticketId: 'DEV-2' }
		});
	});

	it('sends only the instant that changed', () => {
		const result = edit(stopped, { endedLocal: local(Date.parse('2026-09-28T10:00:00Z')) });
		expect(result.kind).toBe('update');
		if (result.kind !== 'update') return;
		expect(result.input.startedAt).toBeUndefined();
		expect(result.input.endedAt).toBe('2026-09-28T10:00:00.000Z');
	});

	it('saves a note-only edit of a legacy out-of-bounds session', () => {
		const legacy = makeSession({
			id: 'legacy',
			note: 'Ancient',
			status: 'stopped',
			startedAt: '1990-01-01T10:00:00.000Z',
			endedAt: '1990-01-01T11:00:00.000Z'
		});
		const result = edit(legacy, { note: 'Renamed' });
		expect(result).toMatchObject({ kind: 'update', input: { note: 'Renamed' } });
		if (result.kind === 'update') expect(result.input).not.toHaveProperty('startedAt');
	});

	it('checks the bounds once a legacy session time is changed', () => {
		const legacy = makeSession({
			status: 'stopped',
			startedAt: '1990-01-01T10:00:00.000Z',
			endedAt: '1990-01-01T11:00:00.000Z'
		});
		const result = edit(legacy, { endedLocal: local(Date.parse('1990-01-01T12:00:00Z')) });
		expect(result).toMatchObject({ kind: 'invalid', errors: { time: 'before_min' } });
	});

	it('keeps a legacy over-long note when it is unchanged', () => {
		const long = makeSession({ status: 'stopped', note: 'x'.repeat(600) });
		const result = edit(long, { projectId: 'proj-b' });
		expect(result.kind).toBe('update');
		if (result.kind === 'update') expect(result.input).not.toHaveProperty('note');
	});

	it('checks a live start against now and never sends endedAt', () => {
		const live = makeSession({
			status: 'active',
			startedAt: iso(NOW - HOUR),
			endedAt: undefined
		});
		expect(edit(live, { startedLocal: local(NOW + HOUR) })).toMatchObject({
			kind: 'invalid',
			errors: { time: 'in_future' }
		});
		const moved = edit(live, { startedLocal: local(NOW - 3 * HOUR) });
		expect(moved.kind).toBe('update');
		if (moved.kind !== 'update') return;
		expect(moved.input.startedAt).toBe(iso(NOW - 3 * HOUR));
		expect(moved.input).not.toHaveProperty('endedAt');
	});
});
