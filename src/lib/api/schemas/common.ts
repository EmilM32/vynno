import * as v from 'valibot';
import type { ActivityType, SessionStatus } from '$lib/types/domain';

export const ACTIVITY_TYPES = [
	'deep_work',
	'meeting',
	'maintenance',
	'coding',
	'debugging',
	'docs',
	'research',
	'other'
] as const satisfies readonly ActivityType[];

export const SESSION_STATUSES = [
	'active',
	'paused',
	'stopped'
] as const satisfies readonly SessionStatus[];

export const activityTypeSchema = v.picklist(ACTIVITY_TYPES);
export const sessionStatusSchema = v.picklist(SESSION_STATUSES);

export const hexColorSchema = v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/));
export const isoDateTimeSchema = v.pipe(v.string(), v.isoTimestamp());
export const idSchema = v.pipe(v.string(), v.minLength(1));

export const errorEnvelopeSchema = v.object({
	error: v.object({
		code: v.pipe(v.string(), v.minLength(1)),
		message: v.pipe(v.string(), v.minLength(1))
	})
});

export type ErrorEnvelope = v.InferOutput<typeof errorEnvelopeSchema>;

export function listSchema<const TSchema extends v.GenericSchema>(item: TSchema) {
	return v.object({
		items: v.array(item)
	});
}

export const sessionCountSchema = v.object({
	count: v.pipe(v.number(), v.minValue(0))
});

export type SessionCountDto = v.InferOutput<typeof sessionCountSchema>;
