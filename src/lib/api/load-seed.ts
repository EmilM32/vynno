import { ApiClient, type FetchFn } from './client';
import { getApiBase } from './config';
import { activityTypeFromDto } from './mappers/activity-type';
import { profileFromDto } from './mappers/profile';
import { projectFromDto } from './mappers/project';
import { sessionFromDto } from './mappers/session';
import { apiPaths } from './paths';
import { activityTypeListDtoSchema } from './schemas/activity-type';
import { profileDtoSchema } from './schemas/profile';
import { projectListDtoSchema } from './schemas/project';
import { SESSION_PAGE_SIZE } from './pagination';
import { sessionListDtoSchema } from './schemas/session';
import type { AppSeed } from './types';

export async function loadAppSeed(fetchFn: FetchFn, base = getApiBase()): Promise<AppSeed> {
	const client = new ApiClient(fetchFn, base);
	const [profile, projectList, activityList, sessionList] = await Promise.all([
		client.get(apiPaths.me(), profileDtoSchema),
		client.get(apiPaths.projects({ includeArchived: true }), projectListDtoSchema),
		client.get(apiPaths.activityTypes(), activityTypeListDtoSchema),
		client.get(apiPaths.sessions({ limit: SESSION_PAGE_SIZE }), sessionListDtoSchema)
	]);

	return {
		profile: profileFromDto(profile, base),
		projects: projectList.items.map(projectFromDto),
		activityTypes: activityList.items.map(activityTypeFromDto),
		sessions: sessionList.items.map(sessionFromDto),
		nextCursor: sessionList.nextCursor
	};
}
