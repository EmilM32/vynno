import type { DayTotalsRange, ProjectListOptions, SessionFilters } from '$lib/types/domain';

export const apiPaths = {
	authLogin: () => '/auth/login',
	authRegister: () => '/auth/register',
	authRegisterCode: () => '/auth/register/code',
	authPasswordForgot: () => '/auth/password/forgot',
	authPasswordReset: () => '/auth/password/reset',
	authLogout: () => '/auth/logout',
	authPasswordChange: () => '/auth/password/change',
	authEmailCode: () => '/auth/email/code',
	authEmailChange: () => '/auth/email/change',
	me: () => '/me',
	meAvatar: () => '/me/avatar',
	mePrefs: () => '/me/prefs',

	projects: (options: ProjectListOptions = {}) => {
		const params = new URLSearchParams();
		if (options.includeArchived) params.set('includeArchived', 'true');
		return withQuery('/projects', params);
	},
	project: (id: string) => `/projects/${id}`,
	projectArchive: (id: string) => `/projects/${id}/archive`,
	projectRestore: (id: string) => `/projects/${id}/restore`,
	projectSessionCount: (id: string) => `/projects/${id}/session-count`,

	activityTypes: () => '/activity-types',
	activityType: (id: string) => `/activity-types/${id}`,
	activityTypeSessionCount: (id: string) => `/activity-types/${id}/session-count`,

	sessions: (filters: SessionFilters = {}) => {
		const params = new URLSearchParams();
		if (filters.status?.length) params.set('status', filters.status.join(','));
		if (filters.from) params.set('from', filters.from);
		if (filters.to) params.set('to', filters.to);
		if (filters.limit != null) params.set('limit', String(filters.limit));
		if (filters.cursor) params.set('cursor', filters.cursor);
		return withQuery('/sessions', params);
	},
	sessionsActive: () => '/sessions/active',
	sessionsManual: () => '/sessions/manual',
	session: (id: string) => `/sessions/${id}`,
	sessionStop: (id: string) => `/sessions/${id}/stop`,

	statsDays: (range: DayTotalsRange) =>
		withQuery(
			'/stats/days',
			new URLSearchParams({ from: range.from, to: range.to, timeZone: range.timeZone })
		)
} as const;

function withQuery(path: string, params: URLSearchParams): string {
	const q = params.toString();
	return q ? `${path}?${q}` : path;
}
