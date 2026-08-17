import type { AppSeed } from '$lib/api/types';
import type { Project, TimeSession, UserProfile } from '$lib/types/domain';

export const PROJECT_IDS = {
	auth: 'proj-auth'
} as const;

export function sampleProfileDto() {
	return { displayName: 'Alex Dev', handle: '@alexdev', avatarUrl: null };
}

export function sampleProjectListDto() {
	return {
		items: [
			{
				id: PROJECT_IDS.auth,
				name: 'Identity',
				color: '#3b82f6',
				code: 'AUTH',
				progressPercent: null,
				archived: false
			}
		]
	};
}

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

export function sampleAppSeed(now = FIXED_NOW): AppSeed {
	const profile: UserProfile = { displayName: 'Alex Dev', handle: '@alexdev' };
	const projects: Project[] = [
		{ id: PROJECT_IDS.auth, name: 'Identity', color: '#3b82f6', code: 'AUTH' }
	];
	const sessions: TimeSession[] = [
		makeSession({
			id: 'sess-today-1',
			note: 'Today work',
			startedAt: new Date(now.getTime() - ms.hours(2)).toISOString(),
			endedAt: new Date(now.getTime() - ms.hours(1)).toISOString()
		}),
		makeSession({
			id: 'sess-yest-1',
			note: 'Yesterday work',
			startedAt: new Date(now.getTime() - ms.hours(26)).toISOString(),
			endedAt: new Date(now.getTime() - ms.hours(25)).toISOString()
		}),
		makeSession({
			id: 'sess-older-1',
			note: 'Older work',
			startedAt: new Date(now.getTime() - ms.hours(50)).toISOString(),
			endedAt: new Date(now.getTime() - ms.hours(49)).toISOString()
		})
	];
	return { profile, projects, sessions };
}

/** Duration helpers for readable fixtures. */
export const ms = {
	sec: (n: number) => n * 1000,
	min: (n: number) => n * 60_000,
	hours: (n: number, mins = 0) => n * 3_600_000 + mins * 60_000
};
