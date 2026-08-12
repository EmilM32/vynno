import type { Project, TimeSession } from '$lib/types/domain';

/** Fixed local "now" for deterministic date-relative tests (Wed Mar 11 2026 15:30). */
export const FIXED_NOW = new Date(2026, 2, 11, 15, 30, 0);

export function makeProject(overrides: Partial<Project> = {}): Project {
	return {
		id: 'proj-auth',
		name: 'Identity',
		color: '#3b82f6',
		code: 'AUTH',
		...overrides
	};
}

export function makeSession(overrides: Partial<TimeSession> = {}): TimeSession {
	return {
		id: 'sess-test',
		projectId: 'proj-auth',
		note: 'Test work',
		status: 'stopped',
		startedAt: localIso(2026, 2, 10, 9, 0),
		endedAt: localIso(2026, 2, 10, 10, 0),
		pausedMs: 0,
		...overrides
	};
}

/** Local calendar datetime → ISO string (timezone-stable within the same runtime). */
export function localIso(
	year: number,
	monthIndex: number,
	day: number,
	hour = 0,
	minute = 0,
	second = 0
): string {
	return new Date(year, monthIndex, day, hour, minute, second).toISOString();
}

/** Duration helpers for readable fixtures. */
export const ms = {
	sec: (n: number) => n * 1000,
	min: (n: number) => n * 60_000,
	hours: (n: number, mins = 0) => n * 3_600_000 + mins * 60_000
};
