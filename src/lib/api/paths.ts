import type { ProjectListOptions, SessionFilters } from '$lib/types/domain';

export const apiPaths = {
	authLogin: () => '/auth/login',
	authRegister: () => '/auth/register',
	authLogout: () => '/auth/logout',
	me: () => '/me',
	meAvatar: () => '/me/avatar',

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
		if (filters.limit != null) params.set('limit', String(filters.limit));
		return withQuery('/sessions', params);
	},
	sessionsActive: () => '/sessions/active',
	sessionsManual: () => '/sessions/manual',
	session: (id: string) => `/sessions/${id}`,
	sessionPause: (id: string) => `/sessions/${id}/pause`,
	sessionResume: (id: string) => `/sessions/${id}/resume`,
	sessionStop: (id: string) => `/sessions/${id}/stop`
} as const;

function withQuery(path: string, params: URLSearchParams): string {
	const q = params.toString();
	return q ? `${path}?${q}` : path;
}
