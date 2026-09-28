import type { TimeSession } from '$lib/types/domain';
import { ApiClient, type FetchFn } from './client';
import { getApiBase } from './config';
import { ApiError } from './errors';
import { activityTypeFromDto } from './mappers/activity-type';
import { profileFromDto } from './mappers/profile';
import { projectFromDto } from './mappers/project';
import { sessionFromDto } from './mappers/session';
import { apiPaths } from './paths';
import { activityTypeListDtoSchema } from './schemas/activity-type';
import { profileDtoSchema } from './schemas/profile';
import { projectListDtoSchema } from './schemas/project';
import { SESSION_PAGE_SIZE } from './pagination';
import { sessionDtoSchema, sessionListDtoSchema } from './schemas/session';
import type { AppSeed } from './types';

/** `404` and `session_not_active` are an idle timer. Anything else fails the seed. */
async function loadActiveSession(client: ApiClient): Promise<TimeSession | null> {
	try {
		const dto = await client.get(apiPaths.sessionsActive(), sessionDtoSchema);
		return sessionFromDto(dto);
	} catch (e) {
		if (e instanceof ApiError && (e.status === 404 || e.code === 'session_not_active')) return null;
		throw e;
	}
}

export async function loadAppSeed(fetchFn: FetchFn, base = getApiBase()): Promise<AppSeed> {
	const client = new ApiClient(fetchFn, base);
	const [profile, projectList, activityList, sessionList, active] = await Promise.all([
		client.get(apiPaths.me(), profileDtoSchema),
		client.get(apiPaths.projects({ includeArchived: true }), projectListDtoSchema),
		client.get(apiPaths.activityTypes(), activityTypeListDtoSchema),
		client.get(apiPaths.sessions({ limit: SESSION_PAGE_SIZE }), sessionListDtoSchema),
		loadActiveSession(client)
	]);

	return {
		profile: profileFromDto(profile, base),
		projects: projectList.items.map(projectFromDto),
		activityTypes: activityList.items.map(activityTypeFromDto),
		sessions: sessionList.items.map(sessionFromDto),
		nextCursor: sessionList.nextCursor,
		active
	};
}
