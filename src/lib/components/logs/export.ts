import {
	addLocalDays,
	calendarDaysInclusive,
	formatLocalTime,
	localDateKey,
	localDateKeyFromDate,
	sessionElapsedMs,
	type LogDateRange
} from '$lib/time/duration';
import type { ActivityType, Project, TimeSession } from '$lib/types/domain';

/**
 * Logs export. Column names are stable snake_case (not translated) so scripts can
 * rely on them. CSV is RFC 4180 with a UTF-8 BOM so spreadsheets read non-ASCII.
 */

/** Lets spreadsheets detect UTF-8. Built from the code point so it stays visible in source. */
export const UTF8_BOM = String.fromCharCode(0xfeff);

/** One column per day; longer ranges would not open usefully in a spreadsheet. */
export const TIMESHEET_MAX_DAYS = 62;

export type ExportContext = {
	project: (id: string) => Project | undefined;
	activity: (id: string) => ActivityType | undefined;
	now: Date;
	timeZone?: string;
};

export type ExportEntry = {
	date: string;
	start: string;
	end: string;
	duration_minutes: number;
	duration_hours: number;
	project: string;
	project_code: string;
	activity: string;
	ticket: string;
	note: string;
	started_at: string;
	ended_at: string;
};

/** A spreadsheet would run text starting with these as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 cell. Text a spreadsheet would evaluate gets a leading `'`; numbers pass as is. */
export function csvCell(value: string | number): string {
	let s = String(value);
	if (typeof value === 'string' && FORMULA_START.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: (string | number)[][]): string {
	return UTF8_BOM + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function hours(ms: number): number {
	return Number((ms / 3_600_000).toFixed(2));
}

/** Stopped sessions as export rows, oldest first (the order a timesheet reads in). */
export function exportEntries(sessions: readonly TimeSession[], ctx: ExportContext): ExportEntry[] {
	return sessions
		.filter((s) => s.status === 'stopped' && s.endedAt)
		.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
		.map((s) => {
			const project = ctx.project(s.projectId);
			const ms = sessionElapsedMs(s);
			return {
				date: localDateKey(s.startedAt, ctx.now, ctx.timeZone),
				start: formatLocalTime(s.startedAt, ctx.timeZone),
				end: formatLocalTime(s.endedAt!, ctx.timeZone),
				duration_minutes: Math.round(ms / 60_000),
				duration_hours: hours(ms),
				project: project?.name ?? '',
				project_code: project?.code ?? '',
				activity: s.activityTypeId ? (ctx.activity(s.activityTypeId)?.name ?? '') : '',
				ticket: s.ticketId ?? '',
				note: s.note,
				started_at: s.startedAt,
				ended_at: s.endedAt!
			};
		});
}

export function entriesCsv(entries: readonly ExportEntry[]): string {
	const header: (keyof ExportEntry)[] = [
		'date',
		'start',
		'end',
		'duration_minutes',
		'duration_hours',
		'project',
		'project_code',
		'activity',
		'ticket',
		'note',
		'started_at',
		'ended_at'
	];
	return csv([header, ...entries.map((e) => header.map((key) => e[key]))]);
}

export function entriesJson(entries: readonly ExportEntry[]): string {
	return JSON.stringify(entries, null, 2) + '\n';
}

/**
 * Projects × days in hours, with row and column totals. Empty days stay blank.
 * `null` when the range is longer than {@link TIMESHEET_MAX_DAYS}.
 */
export function timesheetCsv(
	sessions: readonly TimeSession[],
	range: LogDateRange,
	ctx: ExportContext
): string | null {
	const count = calendarDaysInclusive(range.start, range.end, ctx.timeZone);
	if (count > TIMESHEET_MAX_DAYS) return null;
	const days = Array.from({ length: count }, (_, i) =>
		localDateKeyFromDate(addLocalDays(range.start, i, ctx.timeZone), ctx.timeZone)
	);
	const column = new Map(days.map((day, i) => [day, i]));

	const byProject = new Map<string, number[]>();
	for (const s of sessions) {
		if (s.status !== 'stopped') continue;
		const i = column.get(localDateKey(s.startedAt, ctx.now, ctx.timeZone));
		if (i === undefined) continue;
		const row = byProject.get(s.projectId) ?? days.map(() => 0);
		row[i]! += sessionElapsedMs(s);
		byProject.set(s.projectId, row);
	}

	const name = (id: string) => ctx.project(id)?.name ?? '';
	const projectIds = [...byProject.keys()].sort((a, b) => name(a).localeCompare(name(b)));
	const dayTotals = days.map((_, i) =>
		projectIds.reduce((sum, id) => sum + byProject.get(id)![i]!, 0)
	);
	const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

	return csv([
		['project', 'project_code', ...days, 'total'],
		...projectIds.map((id) => {
			const row = byProject.get(id)!;
			return [
				name(id),
				ctx.project(id)?.code ?? '',
				...row.map((ms) => (ms > 0 ? hours(ms) : '')),
				hours(sum(row))
			];
		}),
		['total', '', ...dayTotals.map((ms) => (ms > 0 ? hours(ms) : '')), hours(sum(dayTotals))]
	]);
}

/** `vynno-entries-2026-09-01_2026-09-30.csv`, or `…-all-<today>.json` without a range. */
export function exportFileName(
	kind: 'entries' | 'timesheet',
	extension: 'csv' | 'json',
	range: LogDateRange | null,
	now: Date,
	timeZone?: string
): string {
	const span = range
		? `${localDateKeyFromDate(range.start, timeZone)}_${localDateKeyFromDate(range.end, timeZone)}`
		: `all-${localDateKeyFromDate(now, timeZone)}`;
	return `vynno-${kind}-${span}.${extension}`;
}
