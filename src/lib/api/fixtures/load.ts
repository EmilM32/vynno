import * as v from 'valibot';
import { profileFromDto } from '$lib/api/mappers/profile';
import { projectFromDto } from '$lib/api/mappers/project';
import { sessionFromDto } from '$lib/api/mappers/session';
import { profileDtoSchema } from '$lib/api/schemas/profile';
import { projectListDtoSchema } from '$lib/api/schemas/project';
import type { AppSeed } from '$lib/api/types';
import profileJson from './profile.json';
import projectsJson from './projects.json';
import sessionSeedJson from './sessions.seed.json';
import { materializeSessionDtos, parseSessionSeed } from './materialize';

export function mockProjectListDto() {
	return v.parse(projectListDtoSchema, projectsJson);
}

export function mockProfileDto() {
	return v.parse(profileDtoSchema, profileJson);
}

export function mockSessionDtos(now = new Date()) {
	const seed = parseSessionSeed(sessionSeedJson);
	return materializeSessionDtos(seed, now);
}

/** Domain snapshot for unit tests (not used by the running app). */
export function fixtureAppSeed(now = new Date()): AppSeed {
	return {
		profile: profileFromDto(mockProfileDto()),
		projects: mockProjectListDto().items.map(projectFromDto),
		sessions: mockSessionDtos(now).map(sessionFromDto)
	};
}
