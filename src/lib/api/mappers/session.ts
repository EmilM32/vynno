import type {
	CreateManualSessionDto,
	SessionDto,
	StartSessionDto,
	UpdateSessionDto
} from '$lib/api/schemas/session';
import type {
	CreateManualSessionInput,
	StartSessionInput,
	TimeSession,
	UpdateSessionInput
} from '$lib/types/domain';

export function sessionFromDto(dto: SessionDto): TimeSession {
	const session: TimeSession = {
		id: dto.id,
		projectId: dto.projectId,
		note: dto.note,
		status: dto.status,
		startedAt: dto.startedAt,
		pausedMs: dto.pausedMs
	};
	if (dto.ticketId) session.ticketId = dto.ticketId;
	if (dto.activityTypeId) session.activityTypeId = dto.activityTypeId;
	if (dto.tags.length) session.tags = [...dto.tags];
	if (dto.endedAt) session.endedAt = dto.endedAt;
	if (dto.pausedAt) session.pausedAt = dto.pausedAt;
	if (dto.targetDurationMs != null) session.targetDurationMs = dto.targetDurationMs;
	return session;
}

export function sessionToDto(session: TimeSession): SessionDto {
	return {
		id: session.id,
		projectId: session.projectId,
		note: session.note,
		ticketId: session.ticketId ?? null,
		activityTypeId: session.activityTypeId ?? null,
		tags: session.tags ? [...session.tags] : [],
		status: session.status,
		startedAt: session.startedAt,
		endedAt: session.endedAt ?? null,
		pausedMs: session.pausedMs,
		pausedAt: session.pausedAt ?? null,
		targetDurationMs: session.targetDurationMs ?? null
	};
}

export function startSessionToDto(input: StartSessionInput): StartSessionDto {
	return {
		projectId: input.projectId,
		note: input.note,
		ticketId: input.ticketId ?? null,
		activityTypeId: input.activityTypeId ?? null,
		tags: input.tags ?? [],
		targetDurationMs: input.targetDurationMs ?? null
	};
}

export function startSessionFromDto(dto: StartSessionDto): StartSessionInput {
	return {
		projectId: dto.projectId,
		note: dto.note,
		...(dto.ticketId ? { ticketId: dto.ticketId } : {}),
		...(dto.activityTypeId ? { activityTypeId: dto.activityTypeId } : {}),
		...(dto.tags?.length ? { tags: dto.tags } : {}),
		...(dto.targetDurationMs != null ? { targetDurationMs: dto.targetDurationMs } : {})
	};
}

export function updateSessionToDto(input: UpdateSessionInput): UpdateSessionDto {
	const dto: UpdateSessionDto = {};
	if (input.projectId !== undefined) dto.projectId = input.projectId;
	if (input.note !== undefined) dto.note = input.note;
	if ('ticketId' in input) dto.ticketId = input.ticketId ?? null;
	if ('activityTypeId' in input) dto.activityTypeId = input.activityTypeId ?? null;
	if (input.tags !== undefined) dto.tags = input.tags;
	if (input.startedAt !== undefined) dto.startedAt = input.startedAt;
	if ('endedAt' in input) dto.endedAt = input.endedAt ?? null;
	if (input.pausedMs !== undefined) dto.pausedMs = input.pausedMs;
	if ('targetDurationMs' in input) dto.targetDurationMs = input.targetDurationMs ?? null;
	return dto;
}

export function createManualSessionToDto(input: CreateManualSessionInput): CreateManualSessionDto {
	return {
		projectId: input.projectId,
		note: input.note,
		ticketId: input.ticketId ?? null,
		activityTypeId: input.activityTypeId ?? null,
		tags: input.tags ?? [],
		targetDurationMs: input.targetDurationMs ?? null,
		startedAt: input.startedAt,
		endedAt: input.endedAt,
		pausedMs: input.pausedMs ?? 0
	};
}
