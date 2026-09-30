import { describe, expect, it } from 'vitest';
import { FIXED_NOW, localIso, makeProject, makeSession } from '$lib/test/factories';
import type { ActivityType } from '$lib/types/domain';
import {
	csvCell,
	entriesCsv,
	entriesJson,
	exportEntries,
	exportFileName,
	TIMESHEET_MAX_DAYS,
	timesheetCsv,
	UTF8_BOM,
	type ExportContext
} from './export';

const auth = makeProject({ id: 'proj-auth', name: 'Identity', code: 'AUTH' });
const docs = makeProject({ id: 'proj-docs', name: 'Docs', code: undefined });
const coding: ActivityType = { id: 'act-coding', name: 'coding', color: 'primary' };

const ctx: ExportContext = {
	project: (id) => [auth, docs].find((p) => p.id === id),
	activity: (id) => (id === coding.id ? coding : undefined),
	now: FIXED_NOW
};

const session = (id: string, day: number, from: number, to: number, extra = {}) =>
	makeSession({
		id,
		startedAt: localIso(2026, 2, day, from),
		endedAt: localIso(2026, 2, day, to),
		...extra
	});

describe('csvCell', () => {
	it('quotes commas, quotes and line breaks', () => {
		expect(csvCell('plain')).toBe('plain');
		expect(csvCell('a, b')).toBe('"a, b"');
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
		expect(csvCell('two\nlines')).toBe('"two\nlines"');
	});

	it('defuses text a spreadsheet would run as a formula, but not numbers', () => {
		expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
		expect(csvCell('- fix bug')).toBe("'- fix bug");
		expect(csvCell('@user')).toBe("'@user");
		expect(csvCell(-1.5)).toBe('-1.5');
	});
});

describe('exportEntries / entriesCsv / entriesJson', () => {
	const sessions = [
		session('late', 11, 13, 14, { note: 'Review, then merge', ticketId: 'DEV-9' }),
		session('early', 10, 9, 10, { activityTypeId: 'act-coding' }),
		makeSession({ id: 'live', status: 'active', endedAt: undefined })
	];

	it('writes stopped rows oldest first with names resolved', () => {
		const entries = exportEntries(sessions, ctx);
		expect(entries.map((e) => e.note)).toEqual(['Test work', 'Review, then merge']);
		expect(entries[0]).toMatchObject({
			date: '2026-03-10',
			start: '09:00',
			end: '10:00',
			duration_minutes: 60,
			duration_hours: 1,
			project: 'Identity',
			project_code: 'AUTH',
			activity: 'coding',
			ticket: ''
		});
	});

	it('builds a CSV with a BOM, a stable header and CRLF rows', () => {
		const text = entriesCsv(exportEntries(sessions, ctx));
		expect(
			text.startsWith(`${UTF8_BOM}date,start,end,duration_minutes,duration_hours,project,`)
		).toBe(true);
		const lines = text.slice(1).trimEnd().split('\r\n');
		expect(lines).toHaveLength(3);
		expect(lines[2]).toContain('"Review, then merge"');
	});

	it('builds JSON with the same fields', () => {
		const parsed = JSON.parse(entriesJson(exportEntries(sessions, ctx)));
		expect(parsed[1]).toMatchObject({ note: 'Review, then merge', ticket: 'DEV-9' });
	});
});

describe('timesheetCsv', () => {
	const range = { start: new Date(2026, 2, 9), end: new Date(2026, 2, 11, 23, 59) };

	it('lays out projects by day with row and column totals', () => {
		const text = timesheetCsv(
			[
				session('a', 9, 9, 11),
				session('b', 11, 9, 10, { projectId: 'proj-docs' }),
				session('c', 11, 13, 14, { projectId: 'proj-docs' }),
				session('outside', 5, 9, 10)
			],
			range,
			ctx
		)!;
		expect(text.slice(1).trimEnd().split('\r\n')).toEqual([
			'project,project_code,2026-03-09,2026-03-10,2026-03-11,total',
			'Docs,,,,2,2',
			'Identity,AUTH,2,,,2',
			'total,,2,,2,4'
		]);
	});

	it(`refuses a range longer than ${TIMESHEET_MAX_DAYS} days`, () => {
		const long = { start: new Date(2026, 0, 1), end: new Date(2026, 2, 31) };
		expect(timesheetCsv([], long, ctx)).toBeNull();
	});
});

describe('exportFileName', () => {
	it('names the range, or "all" with today', () => {
		const range = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 31) };
		expect(exportFileName('entries', 'csv', range, FIXED_NOW)).toBe(
			'vynno-entries-2026-03-01_2026-03-31.csv'
		);
		expect(exportFileName('entries', 'json', null, FIXED_NOW)).toBe(
			'vynno-entries-all-2026-03-11.json'
		);
	});
});
