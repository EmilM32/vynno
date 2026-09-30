import * as v from 'valibot';
import { normalizeNote, normalizeTicketId } from '$lib/text/normalize';
import { idSchema, isoDateTimeSchema, listSchema, sessionStatusSchema } from './common';

/** Request notes. Response `sessionDtoSchema.note` stays unbounded for legacy rows. */
const noteRequestSchema = v.pipe(
	v.string(),
	v.check((note) => normalizeNote(note).ok)
);

/** Request ticket ids. Response ticketId stays an unbounded nullable string. */
const ticketIdRequestSchema = v.pipe(
	v.string(),
	v.check((ticketId) => normalizeTicketId(ticketId).ok)
);

export const sessionDtoSchema = v.object({
	id: idSchema,
	projectId: idSchema,
	note: v.string(),
	ticketId: v.nullable(v.string()),
	activityTypeId: v.nullable(idSchema),
	status: sessionStatusSchema,
	startedAt: isoDateTimeSchema,
	endedAt: v.nullable(isoDateTimeSchema)
});

export const sessionListDtoSchema = v.object({
	items: v.array(sessionDtoSchema),
	nextCursor: v.nullable(v.string())
});

export const startSessionDtoSchema = v.object({
	projectId: idSchema,
	note: noteRequestSchema,
	ticketId: v.optional(v.nullable(ticketIdRequestSchema)),
	activityTypeId: v.optional(v.nullable(idSchema))
});

export const updateSessionDtoSchema = v.object({
	projectId: v.optional(idSchema),
	note: v.optional(noteRequestSchema),
	ticketId: v.optional(v.nullable(ticketIdRequestSchema)),
	activityTypeId: v.optional(v.nullable(idSchema)),
	startedAt: v.optional(isoDateTimeSchema),
	endedAt: v.optional(v.nullable(isoDateTimeSchema))
});

export const createManualSessionDtoSchema = v.object({
	projectId: idSchema,
	note: noteRequestSchema,
	ticketId: v.optional(v.nullable(ticketIdRequestSchema)),
	activityTypeId: v.optional(v.nullable(idSchema)),
	startedAt: isoDateTimeSchema,
	endedAt: isoDateTimeSchema
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
	activityTypeId: v.nullable(idSchema),
	status: sessionStatusSchema,
	started: sessionSeedStartedSchema,
	durationMs: v.pipe(v.number(), v.minValue(0))
});

export const sessionSeedFileSchema = listSchema(sessionSeedItemSchema);

export type SessionDto = v.InferOutput<typeof sessionDtoSchema>;
export type SessionListDto = v.InferOutput<typeof sessionListDtoSchema>;
export type StartSessionDto = v.InferOutput<typeof startSessionDtoSchema>;
export type UpdateSessionDto = v.InferOutput<typeof updateSessionDtoSchema>;
export type CreateManualSessionDto = v.InferOutput<typeof createManualSessionDtoSchema>;
export type SessionSeedItem = v.InferOutput<typeof sessionSeedItemSchema>;
export type SessionSeedFile = v.InferOutput<typeof sessionSeedFileSchema>;
