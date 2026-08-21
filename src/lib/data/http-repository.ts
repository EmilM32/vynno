import { ApiClient, type FetchFn } from '$lib/api/client';
import { getApiBase } from '$lib/api/config';
import { ApiError } from '$lib/api/errors';
import { profileFromDto } from '$lib/api/mappers/profile';
import {
	activityTypeFromDto,
	createActivityTypeToDto,
	updateActivityTypeToDto
} from '$lib/api/mappers/activity-type';
import { createProjectToDto, projectFromDto, updateProjectToDto } from '$lib/api/mappers/project';
import {
	createManualSessionToDto,
	sessionFromDto,
	startSessionToDto,
	updateSessionToDto
} from '$lib/api/mappers/session';
import { apiPaths } from '$lib/api/paths';
import { activityTypeDtoSchema, activityTypeListDtoSchema } from '$lib/api/schemas/activity-type';
import { sessionCountSchema } from '$lib/api/schemas/common';
import { profileDtoSchema } from '$lib/api/schemas/profile';
import { projectDtoSchema, projectListDtoSchema } from '$lib/api/schemas/project';
import { sessionDtoSchema, sessionListDtoSchema } from '$lib/api/schemas/session';
import type {
	ActivityType,
	CreateActivityTypeInput,
	CreateManualSessionInput,
	CreateProjectInput,
	Project,
	ProjectListOptions,
	SessionFilters,
	SessionPage,
	StartSessionInput,
	TimeSession,
	UpdateActivityTypeInput,
	UpdateProfileInput,
	UpdateProjectInput,
	UpdateSessionInput,
	UserProfile
} from '$lib/types/domain';
import type { TimeTrackingRepository } from './repository';

export class HttpTimeTrackingRepository implements TimeTrackingRepository {
	#client: ApiClient;

	constructor(client: ApiClient) {
		this.#client = client;
	}

	static fromFetch(fetchFn: FetchFn, base = getApiBase()): HttpTimeTrackingRepository {
		return new HttpTimeTrackingRepository(new ApiClient(fetchFn, base));
	}

	async listProjects(options: ProjectListOptions = {}): Promise<Project[]> {
		const dto = await this.#client.get(apiPaths.projects(options), projectListDtoSchema);
		return dto.items.map(projectFromDto);
	}

	async getProject(id: string): Promise<Project | undefined> {
		return this.#optional(
			() => this.#client.get(apiPaths.project(id), projectDtoSchema),
			projectFromDto
		);
	}

	async createProject(input: CreateProjectInput): Promise<Project> {
		const dto = await this.#client.post(
			apiPaths.projects(),
			createProjectToDto(input),
			projectDtoSchema
		);
		return projectFromDto(dto);
	}

	async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
		const dto = await this.#client.patch(
			apiPaths.project(id),
			updateProjectToDto(input),
			projectDtoSchema
		);
		return projectFromDto(dto);
	}

	async archiveProject(id: string): Promise<Project> {
		const dto = await this.#client.post(apiPaths.projectArchive(id), {}, projectDtoSchema);
		return projectFromDto(dto);
	}

	async restoreProject(id: string): Promise<Project> {
		const dto = await this.#client.post(apiPaths.projectRestore(id), {}, projectDtoSchema);
		return projectFromDto(dto);
	}

	async deleteProject(id: string): Promise<void> {
		await this.#client.delete(apiPaths.project(id));
	}

	async countSessionsForProject(projectId: string): Promise<number> {
		const dto = await this.#client.get(apiPaths.projectSessionCount(projectId), sessionCountSchema);
		return dto.count;
	}

	async listActivityTypes(): Promise<ActivityType[]> {
		const dto = await this.#client.get(apiPaths.activityTypes(), activityTypeListDtoSchema);
		return dto.items.map(activityTypeFromDto);
	}

	async getActivityType(id: string): Promise<ActivityType | undefined> {
		return this.#optional(
			() => this.#client.get(apiPaths.activityType(id), activityTypeDtoSchema),
			activityTypeFromDto
		);
	}

	async createActivityType(input: CreateActivityTypeInput): Promise<ActivityType> {
		const dto = await this.#client.post(
			apiPaths.activityTypes(),
			createActivityTypeToDto(input),
			activityTypeDtoSchema
		);
		return activityTypeFromDto(dto);
	}

	async updateActivityType(id: string, input: UpdateActivityTypeInput): Promise<ActivityType> {
		const dto = await this.#client.patch(
			apiPaths.activityType(id),
			updateActivityTypeToDto(input),
			activityTypeDtoSchema
		);
		return activityTypeFromDto(dto);
	}

	async deleteActivityType(id: string): Promise<void> {
		await this.#client.delete(apiPaths.activityType(id));
	}

	async countSessionsForActivityType(activityTypeId: string): Promise<number> {
		const dto = await this.#client.get(
			apiPaths.activityTypeSessionCount(activityTypeId),
			sessionCountSchema
		);
		return dto.count;
	}

	async getProfile(): Promise<UserProfile> {
		const dto = await this.#client.get(apiPaths.me(), profileDtoSchema);
		return profileFromDto(dto);
	}

	async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
		const dto = await this.#client.patch(
			apiPaths.me(),
			{ displayName: input.displayName },
			profileDtoSchema
		);
		return profileFromDto(dto);
	}

	async uploadAvatar(file: Blob): Promise<UserProfile> {
		const dto = await this.#client.putFile(apiPaths.meAvatar(), file, profileDtoSchema);
		return profileFromDto(dto);
	}

	async deleteAvatar(): Promise<UserProfile> {
		const dto = await this.#client.deleteJson(apiPaths.meAvatar(), profileDtoSchema);
		return profileFromDto(dto);
	}

	async listSessions(filters: SessionFilters = {}): Promise<SessionPage> {
		const dto = await this.#client.get(apiPaths.sessions(filters), sessionListDtoSchema);
		return {
			items: dto.items.map(sessionFromDto),
			nextCursor: dto.nextCursor
		};
	}

	async getSession(id: string): Promise<TimeSession | undefined> {
		return this.#optional(
			() => this.#client.get(apiPaths.session(id), sessionDtoSchema),
			sessionFromDto
		);
	}

	async getActiveSession(): Promise<TimeSession | null> {
		try {
			const dto = await this.#client.get(apiPaths.sessionsActive(), sessionDtoSchema);
			return sessionFromDto(dto);
		} catch (e) {
			if (e instanceof ApiError && (e.status === 404 || e.code === 'session_not_active')) {
				return null;
			}
			throw e;
		}
	}

	async startSession(input: StartSessionInput): Promise<TimeSession> {
		const dto = await this.#client.post(
			apiPaths.sessions(),
			startSessionToDto(input),
			sessionDtoSchema
		);
		return sessionFromDto(dto);
	}

	async pauseSession(id: string): Promise<TimeSession> {
		const dto = await this.#client.post(apiPaths.sessionPause(id), {}, sessionDtoSchema);
		return sessionFromDto(dto);
	}

	async resumeSession(id: string): Promise<TimeSession> {
		const dto = await this.#client.post(apiPaths.sessionResume(id), {}, sessionDtoSchema);
		return sessionFromDto(dto);
	}

	async stopSession(id: string): Promise<TimeSession> {
		const dto = await this.#client.post(apiPaths.sessionStop(id), {}, sessionDtoSchema);
		return sessionFromDto(dto);
	}

	async updateSession(id: string, input: UpdateSessionInput): Promise<TimeSession> {
		const dto = await this.#client.patch(
			apiPaths.session(id),
			updateSessionToDto(input),
			sessionDtoSchema
		);
		return sessionFromDto(dto);
	}

	async deleteSession(id: string): Promise<void> {
		await this.#client.delete(apiPaths.session(id));
	}

	async createManualSession(input: CreateManualSessionInput): Promise<TimeSession> {
		const dto = await this.#client.post(
			apiPaths.sessionsManual(),
			createManualSessionToDto(input),
			sessionDtoSchema
		);
		return sessionFromDto(dto);
	}

	async #optional<TDto, TOut>(
		load: () => Promise<TDto>,
		map: (dto: TDto) => TOut
	): Promise<TOut | undefined> {
		try {
			return map(await load());
		} catch (e) {
			if (e instanceof ApiError && e.status === 404) return undefined;
			throw e;
		}
	}
}
