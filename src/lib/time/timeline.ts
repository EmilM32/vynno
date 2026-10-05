/**
 * Insights timeline data (ADR-0028).
 *
 * Sessions become per-day segments: clipped to the range, split at local midnight in the
 * user's zone, the live session drawn to `nowMs`. Unlike `/stats/days` (whole duration on
 * the start day), a timeline draws where the time actually fell, so a session past
 * midnight shows on both days and a day's timeline total can differ from its day total.
 */

import { m } from '$lib/paraglide/messages.js';
import { roundShares } from './aggregates';
import {
	addDaysInTimeZone,
	dateKeyInTimeZone,
	partsInTimeZone,
	startOfDayInTimeZone
} from './timezone';
import type { Project, TimeSession } from '$lib/types/domain';

export const UNKNOWN_PROJECT_COLOR = '#64748b';
export const MINUTES_PER_DAY = 1440;

export type TimelineDay = {
	/** Civil date `YYYY-MM-DD` in the user's zone. */
	key: string;
	startMs: number;
	/** Next local midnight (exclusive). */
	endMs: number;
	isToday: boolean;
};

export type TimelineSegment = {
	/** `${sessionId}:${dateKey}` — one session can make one segment per day. */
	id: string;
	sessionId: string;
	projectId: string;
	projectName: string;
	color: string;
	note: string;
	ticketId?: string;
	dateKey: string;
	startMs: number;
	endMs: number;
	/** Wall-clock minutes into the local day, 0–1440. */
	startMin: number;
	endMin: number;
	/** The whole session, for tooltips on a split segment. */
	sessionStartMs: number;
	sessionEndMs: number;
	active: boolean;
	/** Row within the day when sessions overlap (0 when they don't). */
	lane: number;
};

export type ProjectTotal = {
	id: string;
	label: string;
	color: string;
	ms: number;
	percent: number;
};

export type HourRow = {
	hour: number;
	/** Minutes per project id in this hour, summed over the range. */
	byProject: Record<string, number>;
	totalMin: number;
};

/** Local days from the range start through the day holding `range.end`. */
export function timelineDays(
	range: { start: Date; end: Date },
	nowMs: number,
	timeZone: string
): TimelineDay[] {
	const todayKey = dateKeyInTimeZone(new Date(nowMs), timeZone);
	const days: TimelineDay[] = [];
	let start = startOfDayInTimeZone(range.start, timeZone);
	while (start.getTime() <= range.end.getTime() && days.length < 400) {
		const next = addDaysInTimeZone(start, 1, timeZone);
		const key = dateKeyInTimeZone(start, timeZone);
		days.push({ key, startMs: start.getTime(), endMs: next.getTime(), isToday: key === todayKey });
		start = next;
	}
	return days;
}

function wallMinutes(ms: number, timeZone: string): number {
	const p = partsInTimeZone(new Date(ms), timeZone);
	return p.hour * 60 + p.minute + p.second / 60;
}

/**
 * Segments for every session overlapping `days`, ordered by start. Lanes are packed.
 * `projects` should include archived ones so old history keeps its name and colour.
 */
export function timelineSegments(
	sessions: readonly TimeSession[],
	projects: readonly Project[],
	days: readonly TimelineDay[],
	nowMs: number,
	timeZone: string
): TimelineSegment[] {
	if (days.length === 0) return [];
	const windowStart = days[0].startMs;
	const windowEnd = days[days.length - 1].endMs;
	const byId = new Map(projects.map((p) => [p.id, p]));
	const out: TimelineSegment[] = [];

	for (const s of sessions) {
		const sessionStart = Date.parse(s.startedAt);
		const active = s.status === 'active' || !s.endedAt;
		const sessionEnd = active ? nowMs : Date.parse(s.endedAt!);
		if (Number.isNaN(sessionStart) || Number.isNaN(sessionEnd)) continue;
		if (sessionEnd <= windowStart || sessionStart >= windowEnd || sessionEnd <= sessionStart)
			continue;

		const project = byId.get(s.projectId);
		for (let i = firstDayEndingAfter(days, sessionStart); i < days.length; i++) {
			const day = days[i];
			if (day.startMs >= sessionEnd) break;
			const startMs = Math.max(sessionStart, day.startMs);
			const endMs = Math.min(sessionEnd, day.endMs);
			if (endMs <= startMs) continue;
			out.push({
				id: `${s.id}:${day.key}`,
				sessionId: s.id,
				projectId: s.projectId,
				projectName: project?.name ?? m.common_unknown(),
				color: project?.color ?? UNKNOWN_PROJECT_COLOR,
				note: s.note,
				ticketId: s.ticketId,
				dateKey: day.key,
				startMs,
				endMs,
				startMin: startMs === day.startMs ? 0 : wallMinutes(startMs, timeZone),
				endMin: endMs === day.endMs ? MINUTES_PER_DAY : wallMinutes(endMs, timeZone),
				sessionStartMs: sessionStart,
				sessionEndMs: sessionEnd,
				active,
				lane: 0
			});
		}
	}

	out.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
	return packLanes(out);
}

/** Index of the first day that ends after `ms` (days are sorted and contiguous). */
function firstDayEndingAfter(days: readonly TimelineDay[], ms: number): number {
	let lo = 0;
	let hi = days.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (days[mid].endMs <= ms) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

/** Greedy per-day lanes: a segment takes the first lane whose last bar has ended. */
export function packLanes(segments: readonly TimelineSegment[]): TimelineSegment[] {
	const laneEnds = new Map<string, number[]>();
	return segments.map((seg) => {
		const ends = laneEnds.get(seg.dateKey) ?? [];
		let lane = ends.findIndex((end) => end <= seg.startMs);
		if (lane === -1) lane = ends.length;
		ends[lane] = seg.endMs;
		laneEnds.set(seg.dateKey, ends);
		return { ...seg, lane };
	});
}

/** Lanes per day (at least 1, so an empty day still gets a row). */
export function laneCounts(segments: readonly TimelineSegment[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const seg of segments) {
		counts.set(seg.dateKey, Math.max(counts.get(seg.dateKey) ?? 1, seg.lane + 1));
	}
	return counts;
}

export function dayTotals(segments: readonly TimelineSegment[]): Map<string, number> {
	const totals = new Map<string, number>();
	for (const seg of segments) {
		totals.set(seg.dateKey, (totals.get(seg.dateKey) ?? 0) + seg.endMs - seg.startMs);
	}
	return totals;
}

/** Per-project totals, largest first, with shares that sum to 100. */
export function projectTotals(segments: readonly TimelineSegment[]): ProjectTotal[] {
	const totals = new Map<string, ProjectTotal>();
	for (const seg of segments) {
		const row = totals.get(seg.projectId);
		const ms = seg.endMs - seg.startMs;
		if (row) row.ms += ms;
		else
			totals.set(seg.projectId, {
				id: seg.projectId,
				label: seg.projectName,
				color: seg.color,
				ms,
				percent: 0
			});
	}
	const rows = [...totals.values()].sort((a, b) => b.ms - a.ms);
	const shares = roundShares(rows.map((r) => r.ms));
	return rows.map((r, i) => ({ ...r, percent: shares[i] }));
}

/** 24 rows of minutes per project, each segment split across the hours it covers. */
export function hourlyByProject(segments: readonly TimelineSegment[]): HourRow[] {
	const rows: HourRow[] = Array.from({ length: 24 }, (_, hour) => ({
		hour,
		byProject: {},
		totalMin: 0
	}));
	for (const seg of segments) {
		const first = Math.floor(seg.startMin / 60);
		const last = Math.min(23, Math.ceil(seg.endMin / 60) - 1);
		for (let h = first; h <= last; h++) {
			const min = Math.min(seg.endMin, (h + 1) * 60) - Math.max(seg.startMin, h * 60);
			if (min <= 0) continue;
			const row = rows[h];
			row.byProject[seg.projectId] = (row.byProject[seg.projectId] ?? 0) + min;
			row.totalMin += min;
		}
	}
	return rows;
}

/**
 * Visible clock window in minutes: earliest start to latest end, out to whole hours,
 * at least `minHours` wide, centred on the work when widened. Empty → 08:00–18:00.
 */
export function fitClockWindow(
	segments: readonly TimelineSegment[],
	minHours = 8
): [number, number] {
	if (segments.length === 0) return [8 * 60, 18 * 60];
	let lo = Math.floor(Math.min(...segments.map((s) => s.startMin)) / 60);
	let hi = Math.ceil(Math.max(...segments.map((s) => s.endMin)) / 60);
	while (hi - lo < minHours) {
		if (lo > 0) lo--;
		if (hi - lo < minHours && hi < 24) hi++;
	}
	return [lo * 60, hi * 60];
}

export type ClockSpan = 'fit' | 'day';

/** The fitted working-hours window, or the whole day. */
export function clockWindow(
	segments: readonly TimelineSegment[],
	span: ClockSpan
): [number, number] {
	return span === 'day' ? [0, MINUTES_PER_DAY] : fitClockWindow(segments);
}

/** Overlap window for `GET /sessions?from&to` covering every day of the timeline. */
export function sessionWindowForDays(
	days: readonly TimelineDay[]
): { from: string; to: string } | null {
	if (days.length === 0) return null;
	return {
		from: new Date(days[0].startMs).toISOString(),
		to: new Date(days[days.length - 1].endMs).toISOString()
	};
}

/** `HH:MM` for a minute-of-day value. */
export function formatMinuteOfDay(min: number): string {
	const total = Math.round(min);
	const h = Math.floor(total / 60) % 24;
	const m = total % 60;
	return `${String(total >= MINUTES_PER_DAY ? 24 : h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function noonUtc(key: string): Date {
	const [y, m, d] = key.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d, 12));
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * One formatter per locale and style: building an `Intl.DateTimeFormat` costs far more than
 * formatting with one, and labels are made per session (EMI-59, EMI-194).
 */
function dayFormatter(locale: string, style: 'weekday' | 'monthDay'): Intl.DateTimeFormat {
	const key = `${locale}|${style}`;
	let dtf = dayFormatters.get(key);
	if (!dtf) {
		dtf = new Intl.DateTimeFormat(
			locale,
			style === 'weekday'
				? { weekday: 'short', timeZone: 'UTC' }
				: { month: 'short', day: 'numeric', timeZone: 'UTC' }
		);
		dayFormatters.set(key, dtf);
	}
	return dtf;
}

/** `Mon 6` for a civil date key. Formats at UTC noon so no zone can shift the day. */
export function formatDayKey(key: string, locale: string): string {
	const date = noonUtc(key);
	return `${dayFormatter(locale, 'weekday').format(date)} ${date.getUTCDate()}`;
}

/** `Mar 9` for a civil date key. */
export function formatMonthDay(key: string, locale: string): string {
	return dayFormatter(locale, 'monthDay').format(noonUtc(key));
}

export type BarRect = { x: number; y: number; width: number; height: number };

const px = (v: number) => String(Math.round(v * 100) / 100);

/**
 * One SVG path per colour for many bars: a few DOM nodes instead of a component or `<rect>`
 * per session, which made drawing two busy months a long main-thread task (ADR-0028 §7).
 * Each bar is a rectangle with corners rounded by up to `radius`; empty bars are skipped.
 */
export function colorPaths<T extends { color: string }>(
	items: readonly T[],
	rect: (item: T) => BarRect,
	radius = 2
): { color: string; d: string }[] {
	const byColor = new Map<string, string>();
	for (const item of items) {
		const { x, y, width: w, height: h } = rect(item);
		if (!(w > 0 && h > 0)) continue;
		const r = Math.min(radius, w / 2, h / 2);
		const a = `a${px(r)},${px(r)} 0 0 1`;
		const d =
			`M${px(x + r)},${px(y)}h${px(w - 2 * r)}${a} ${px(r)},${px(r)}v${px(h - 2 * r)}` +
			`${a} ${px(-r)},${px(r)}h${px(-(w - 2 * r))}${a} ${px(-r)},${px(-r)}` +
			`v${px(-(h - 2 * r))}${a} ${px(r)},${px(-r)}z`;
		byColor.set(item.color, (byColor.get(item.color) ?? '') + d);
	}
	return [...byColor].map(([color, d]) => ({ color, d }));
}

/** Items grouped by a key, in their original order. */
export function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
	const out = new Map<string, T[]>();
	for (const item of items) {
		const k = key(item);
		const list = out.get(k);
		if (list) list.push(item);
		else out.set(k, [item]);
	}
	return out;
}

/**
 * The bar under a pointer at plot pixels (`px`, `py`), for a band-row chart drawn with
 * `colorPaths`: LayerChart's per-item hit areas would bring back one element per session.
 * `y` gives a row's top, `bandwidth` its height, and `xOf` a bar's left and right pixels;
 * like the drawing, a bar is at least one pixel wide.
 */
export function barAt<T>(
	byRow: ReadonlyMap<string, readonly T[]>,
	rows: readonly string[],
	y: (row: string) => number,
	bandwidth: number,
	xOf: (bar: T) => [number, number],
	px: number,
	py: number
): T | undefined {
	const row = rows.find((r) => py >= y(r) && py < y(r) + bandwidth);
	if (row === undefined) return undefined;
	return byRow.get(row)?.find((bar) => {
		const [x0, x1] = xOf(bar);
		return px >= x0 && px <= Math.max(x1, x0 + 1);
	});
}

/** Clock ticks every `step` hours across `[lo, hi]` minutes. */
export function hourTicks([lo, hi]: [number, number], maxTicks = 13): number[] {
	const hours = (hi - lo) / 60;
	const step = [1, 2, 3, 4, 6].find((s) => hours / s + 1 <= maxTicks) ?? 6;
	const ticks: number[] = [];
	for (let m = Math.ceil(lo / (step * 60)) * step * 60; m <= hi; m += step * 60) ticks.push(m);
	return ticks;
}
