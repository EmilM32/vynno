import * as v from 'valibot';
import {
	activityTypeSchema,
	idSchema,
	isoDateTimeSchema,
	listSchema,
	sessionStatusSchema
} from './common';

export const sessionDtoSchema = v.object({
	id: idSchema,
	projectId: idSchema,
	note: v.string(),
	ticketId: v.nullable(v.string()),
	activityType: v.nullable(activityTypeSchema),
	tags: v.array(v.string()),
	status: sessionStatusSchema,
	startedAt: isoDateTimeSchema,
	endedAt: v.nullable(isoDateTimeSchema),
	pausedMs: v.pipe(v.number(), v.minValue(0)),
	pausedAt: v.nullable(isoDateTimeSchema),
	targetDurationMs: v.nullable(v.pipe(v.number(), v.minValue(0)))
});

export const sessionListDtoSchema = listSchema(sessionDtoSchema);

export const startSessionDtoSchema = v.object({
	projectId: idSchema,
	note: v.string(),
	ticketId: v.optional(v.nullable(v.string())),
	activityType: v.optional(v.nullable(activityTypeSchema)),
	tags: v.optional(v.array(v.string())),
	targetDurationMs: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0))))
});

export const sessionSeedStartedSchema = v.object({
	offsetDays: v.number(),
	hour: v.pipe(v.number(), v.minValue(0), v.maxValue(23)),
	minute: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(59)))
});

export const sessionSeedItemSchema = v.object({
	id: idSchema,
	projectId: idSchema,
	note: v.string(),
	ticketId: v.nullable(v.string()),
	activityType: v.nullable(activityTypeSchema),
	tags: v.array(v.string()),
	status: sessionStatusSchema,
	started: sessionSeedStartedSchema,
	durationMs: v.pipe(v.number(), v.minValue(0)),
	pausedMs: v.pipe(v.number(), v.minValue(0)),
	pausedAt: v.optional(v.nullable(v.string())),
	targetDurationMs: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0))))
});

export const sessionSeedFileSchema = listSchema(sessionSeedItemSchema);

export type SessionDto = v.InferOutput<typeof sessionDtoSchema>;
export type SessionListDto = v.InferOutput<typeof sessionListDtoSchema>;
export type StartSessionDto = v.InferOutput<typeof startSessionDtoSchema>;
export type SessionSeedItem = v.InferOutput<typeof sessionSeedItemSchema>;
export type SessionSeedFile = v.InferOutput<typeof sessionSeedFileSchema>;
