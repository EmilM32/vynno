import { ApiClient, type FetchFn } from './client';
import { getApiBase } from './config';
import { profileFromDto } from './mappers/profile';
import { projectFromDto } from './mappers/project';
import { sessionFromDto } from './mappers/session';
import { apiPaths } from './paths';
import { profileDtoSchema } from './schemas/profile';
import { projectListDtoSchema } from './schemas/project';
import { sessionListDtoSchema } from './schemas/session';
import type { AppSeed } from './types';

export async function loadAppSeed(fetchFn: FetchFn, base = getApiBase()): Promise<AppSeed> {
	const client = new ApiClient(fetchFn, base);
	const [profile, projectList, sessionList] = await Promise.all([
		client.get(apiPaths.me(), profileDtoSchema),
		client.get(apiPaths.projects({ includeArchived: true }), projectListDtoSchema),
		client.get(apiPaths.sessions(), sessionListDtoSchema)
	]);

	return {
		profile: profileFromDto(profile),
		projects: projectList.items.map(projectFromDto),
		sessions: sessionList.items.map(sessionFromDto)
	};
}
