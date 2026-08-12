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

/** Build historical stopped sessions relative to "now" so charts stay realistic. */
export function buildMockSessions(now = new Date()): TimeSession[] {
	const day = (offsetDays: number, hour: number, minute = 0) => {
		const d = new Date(now);
		d.setDate(d.getDate() + offsetDays);
		d.setHours(hour, minute, 0, 0);
		return d.toISOString();
	};

	const ended = (startIso: string, durationMs: number) =>
		new Date(Date.parse(startIso) + durationMs).toISOString();

	const h = (hours: number, mins = 0) => hours * 3_600_000 + mins * 60_000;

	const raw: {
		id: string;
		projectId: string;
		note: string;
		ticketId?: string;
		activityType?: TimeSession['activityType'];
		tags?: string[];
		offsetDays: number;
		hour: number;
		minute?: number;
		durationMs: number;
	}[] = [
		// Today
		{
			id: 'sess-today-1',
			projectId: PROJECT_IDS.alpha,
			note: 'Database schema migration script',
			activityType: 'coding',
			offsetDays: 0,
			hour: 9,
			durationMs: h(2, 15)
		},
		{
			id: 'sess-today-2',
			projectId: PROJECT_IDS.ui,
			note: 'Update component library tokens',
			activityType: 'coding',
			offsetDays: 0,
			hour: 11,
			minute: 30,
			durationMs: h(1, 45) + 30_000
		},
		{
			id: 'sess-today-3',
			projectId: PROJECT_IDS.internal,
			note: 'Team Sync Meeting',
			activityType: 'meeting',
			offsetDays: 0,
			hour: 13,
			minute: 30,
			durationMs: h(0, 45)
		},
		{
			id: 'sess-today-4',
			projectId: PROJECT_IDS.api,
			note: 'Setup authentication endpoints',
			ticketId: 'API-12',
			activityType: 'coding',
			offsetDays: 0,
			hour: 14,
			minute: 30,
			durationMs: h(0, 42) + 8_000
		},
		// Yesterday
		{
			id: 'sess-yest-1',
			projectId: PROJECT_IDS.auth,
			note: 'Refactoring Auth Service',
			ticketId: 'DEV-840',
			activityType: 'deep_work',
			tags: ['Backend'],
			offsetDays: -1,
			hour: 10,
			durationMs: h(2, 15)
		},
		{
			id: 'sess-yest-2',
			projectId: PROJECT_IDS.ui,
			note: 'UI Implementation',
			activityType: 'coding',
			offsetDays: -1,
			hour: 14,
			durationMs: h(0, 45)
		},
		{
			id: 'sess-yest-3',
			projectId: PROJECT_IDS.api,
			note: 'Fixing Bug #402',
			activityType: 'debugging',
			offsetDays: -1,
			hour: 15,
			durationMs: h(1, 10)
		},
		{
			id: 'sess-yest-4',
			projectId: PROJECT_IDS.alpha,
			note: 'Query plan review',
			activityType: 'research',
			offsetDays: -1,
			hour: 9,
			durationMs: h(1, 30)
		},
		// -2
		{
			id: 'sess-d2-1',
			projectId: PROJECT_IDS.auth,
			note: 'OAuth callback hardening',
			ticketId: 'DEV-801',
			activityType: 'coding',
			offsetDays: -2,
			hour: 9,
			minute: 30,
			durationMs: h(3)
		},
		{
			id: 'sess-d2-2',
			projectId: PROJECT_IDS.internal,
			note: 'Standup + planning',
			activityType: 'meeting',
			offsetDays: -2,
			hour: 14,
			durationMs: h(0, 50)
		},
		// -3
		{
			id: 'sess-d3-1',
			projectId: PROJECT_IDS.alpha,
			note: 'API gateway rate limits',
			activityType: 'coding',
			offsetDays: -3,
			hour: 11,
			durationMs: h(1, 30)
		},
		{
			id: 'sess-d3-2',
			projectId: PROJECT_IDS.ui,
			note: 'Token audit docs',
			activityType: 'docs',
			offsetDays: -3,
			hour: 15,
			durationMs: h(2)
		},
		// -4
		{
			id: 'sess-d4-1',
			projectId: PROJECT_IDS.api,
			note: 'Webhook signature verification',
			activityType: 'deep_work',
			offsetDays: -4,
			hour: 10,
			durationMs: h(2, 40)
		},
		{
			id: 'sess-d4-2',
			projectId: PROJECT_IDS.alpha,
			note: 'Index maintenance',
			activityType: 'maintenance',
			offsetDays: -4,
			hour: 14,
			durationMs: h(1, 15)
		},
		// -5
		{
			id: 'sess-d5-1',
			projectId: PROJECT_IDS.ui,
			note: 'Dashboard density pass',
			activityType: 'coding',
			offsetDays: -5,
			hour: 9,
			durationMs: h(3, 20)
		},
		{
			id: 'sess-d5-2',
			projectId: PROJECT_IDS.auth,
			note: 'Session cookie review',
			activityType: 'debugging',
			offsetDays: -5,
			hour: 14,
			durationMs: h(1, 45)
		},
		// -6 / -7 (earlier week boundary)
		{
			id: 'sess-d6-1',
			projectId: PROJECT_IDS.internal,
			note: 'Retrospective notes',
			activityType: 'docs',
			offsetDays: -6,
			hour: 11,
			durationMs: h(1)
		},
		{
			id: 'sess-d7-1',
			projectId: PROJECT_IDS.alpha,
			note: 'Schema ADR draft',
			activityType: 'docs',
			offsetDays: -7,
			hour: 10,
			durationMs: h(2, 30)
		},
		// Earlier in month (~2 weeks ago)
		{
			id: 'sess-m1',
			projectId: PROJECT_IDS.api,
			note: 'Initial v2 routing structure',
			activityType: 'deep_work',
			offsetDays: -12,
			hour: 10,
			durationMs: h(4)
		},
		{
			id: 'sess-m2',
			projectId: PROJECT_IDS.ui,
			note: 'Sync with UI team regarding button variants',
			activityType: 'meeting',
			offsetDays: -14,
			hour: 13,
			durationMs: h(0, 45)
		},
		{
			id: 'sess-m3',
			projectId: PROJECT_IDS.auth,
			note: 'Passwordless spike',
			activityType: 'research',
			offsetDays: -18,
			hour: 9,
			durationMs: h(3, 15)
		},
		{
			id: 'sess-m4',
			projectId: PROJECT_IDS.alpha,
			note: 'Optimizing index usage on user_events table',
			activityType: 'maintenance',
			offsetDays: -20,
			hour: 14,
			minute: 15,
			durationMs: h(1, 15)
		}
	];

	return raw.map((r) => {
		const startedAt = day(r.offsetDays, r.hour, r.minute ?? 0);
		return {
			id: r.id,
			projectId: r.projectId,
			note: r.note,
			ticketId: r.ticketId,
			activityType: r.activityType,
			tags: r.tags,
			status: 'stopped' as const,
			startedAt,
			endedAt: ended(startedAt, r.durationMs),
			pausedMs: 0
		};
	});
}
