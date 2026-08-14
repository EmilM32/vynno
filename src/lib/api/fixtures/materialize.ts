import * as v from 'valibot';
import type { SessionDto, SessionSeedFile, SessionSeedItem } from '$lib/api/schemas/session';
import { sessionDtoSchema, sessionSeedFileSchema } from '$lib/api/schemas/session';

export function parseSessionSeed(raw: unknown): SessionSeedFile {
	return v.parse(sessionSeedFileSchema, raw);
}

export function materializeSessionDto(item: SessionSeedItem, now: Date): SessionDto {
	const started = new Date(now);
	started.setDate(started.getDate() + item.started.offsetDays);
	started.setHours(item.started.hour, item.started.minute ?? 0, 0, 0);
	const ended = new Date(started.getTime() + item.durationMs);

	const dto: SessionDto = {
		id: item.id,
		projectId: item.projectId,
		note: item.note,
		ticketId: item.ticketId,
		activityType: item.activityType,
		tags: [...item.tags],
		status: item.status,
		startedAt: started.toISOString(),
		endedAt: item.status === 'stopped' ? ended.toISOString() : null,
		pausedMs: item.pausedMs,
		pausedAt: item.pausedAt ?? null,
		targetDurationMs: item.targetDurationMs ?? null
	};

	return v.parse(sessionDtoSchema, dto);
}

export function materializeSessionDtos(seed: SessionSeedFile, now = new Date()): SessionDto[] {
	return seed.items.map((item) => materializeSessionDto(item, now));
}
