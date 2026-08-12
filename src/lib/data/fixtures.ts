import type { Project, TimeSession, UserProfile } from '$lib/types/domain';

/** Stable mock ids — referenced across fixtures. */
export const PROJECT_IDS = {
	auth: 'proj-auth',
	alpha: 'proj-alpha',
	ui: 'proj-ui',
	api: 'proj-api',
	internal: 'proj-internal'
} as const;

export const MOCK_PROJECTS: Project[] = [
	{
		id: PROJECT_IDS.auth,
		name: 'Identity',
		color: '#3b82f6',
		code: 'AUTH',
		progressPercent: 60
	},
	{
		id: PROJECT_IDS.alpha,
		name: 'Project Alpha',
		color: '#3b82f6',
		code: 'ALPHA',
		progressPercent: 75
	},
	{
		id: PROJECT_IDS.ui,
		name: 'UI Design System',
		color: '#8b5cf6',
		code: 'UI',
		progressPercent: 42
	},
	{
		id: PROJECT_IDS.api,
		name: 'Side Project API',
		color: '#10b981',
		code: 'API',
		progressPercent: 20
	},
	{
		id: PROJECT_IDS.internal,
		name: 'Internal',
		color: '#64748b',
		code: 'INT'
	}
];

export const MOCK_PROFILE: UserProfile = {
	displayName: 'Alex Dev',
	handle: '@alexdev'
};

/** Build historical stopped sessions relative to "now" so Today totals stay realistic. */
export function buildMockSessions(now = new Date()): TimeSession[] {
	const day = (offsetDays: number, hour: number, minute = 0) => {
		const d = new Date(now);
		d.setDate(d.getDate() + offsetDays);
		d.setHours(hour, minute, 0, 0);
		return d.toISOString();
	};

	const ended = (startIso: string, durationMs: number) =>
		new Date(Date.parse(startIso) + durationMs).toISOString();

	const sessions: TimeSession[] = [
		// Today
		{
			id: 'sess-today-1',
			projectId: PROJECT_IDS.alpha,
			note: 'Database schema migration script',
			activityType: 'coding',
			status: 'stopped',
			startedAt: day(0, 9, 0),
			endedAt: ended(day(0, 9, 0), 2 * 3_600_000 + 15 * 60_000),
			pausedMs: 0
		},
		{
			id: 'sess-today-2',
			projectId: PROJECT_IDS.ui,
			note: 'Update component library tokens',
			activityType: 'coding',
			status: 'stopped',
			startedAt: day(0, 11, 30),
			endedAt: ended(day(0, 11, 30), 1 * 3_600_000 + 45 * 60_000 + 30_000),
			pausedMs: 0
		},
		{
			id: 'sess-today-3',
			projectId: PROJECT_IDS.internal,
			note: 'Team Sync Meeting',
			activityType: 'meeting',
			status: 'stopped',
			startedAt: day(0, 13, 30),
			endedAt: ended(day(0, 13, 30), 45 * 60_000),
			pausedMs: 0
		},
		{
			id: 'sess-today-4',
			projectId: PROJECT_IDS.api,
			note: 'Setup authentication endpoints',
			ticketId: 'API-12',
			activityType: 'coding',
			status: 'stopped',
			startedAt: day(0, 14, 30),
			endedAt: ended(day(0, 14, 30), 42 * 60_000 + 8_000),
			pausedMs: 0
		},
		// Yesterday
		{
			id: 'sess-yest-1',
			projectId: PROJECT_IDS.auth,
			note: 'Refactoring Auth Service',
			ticketId: 'DEV-840',
			activityType: 'deep_work',
			tags: ['Backend'],
			status: 'stopped',
			startedAt: day(-1, 10, 0),
			endedAt: ended(day(-1, 10, 0), 2 * 3_600_000 + 15 * 60_000),
			pausedMs: 0
		},
		{
			id: 'sess-yest-2',
			projectId: PROJECT_IDS.ui,
			note: 'UI Implementation',
			activityType: 'coding',
			status: 'stopped',
			startedAt: day(-1, 14, 0),
			endedAt: ended(day(-1, 14, 0), 45 * 60_000),
			pausedMs: 0
		},
		{
			id: 'sess-yest-3',
			projectId: PROJECT_IDS.api,
			note: 'Fixing Bug #402',
			activityType: 'debugging',
			status: 'stopped',
			startedAt: day(-1, 15, 0),
			endedAt: ended(day(-1, 15, 0), 1 * 3_600_000 + 10 * 60_000),
			pausedMs: 0
		},
		// Earlier this week (for recent tasks variety)
		{
			id: 'sess-week-1',
			projectId: PROJECT_IDS.auth,
			note: 'OAuth callback hardening',
			ticketId: 'DEV-801',
			activityType: 'coding',
			status: 'stopped',
			startedAt: day(-2, 9, 30),
			endedAt: ended(day(-2, 9, 30), 3 * 3_600_000),
			pausedMs: 0
		},
		{
			id: 'sess-week-2',
			projectId: PROJECT_IDS.alpha,
			note: 'API gateway rate limits',
			activityType: 'coding',
			status: 'stopped',
			startedAt: day(-3, 11, 0),
			endedAt: ended(day(-3, 11, 0), 1 * 3_600_000 + 30 * 60_000),
			pausedMs: 0
		}
	];

	return sessions;
}
