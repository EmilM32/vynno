import type { SessionDto, StartSessionDto } from '$lib/api/schemas/session';
import type { StartSessionInput, TimeSession } from '$lib/types/domain';

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
	if (dto.activityType) session.activityType = dto.activityType;
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
		activityType: session.activityType ?? null,
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
		activityType: input.activityType ?? null,
		tags: input.tags ?? [],
		targetDurationMs: input.targetDurationMs ?? null
	};
}
