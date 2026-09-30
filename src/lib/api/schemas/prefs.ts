import * as v from 'valibot';
import { idSchema } from './common';

/** Contract bounds for `dailyTargetMs`: one minute to one day. */
export const DAILY_TARGET_MIN_MS = 60_000;
export const DAILY_TARGET_MAX_MS = 86_400_000;

const dailyTargetRequestSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(DAILY_TARGET_MIN_MS),
	v.maxValue(DAILY_TARGET_MAX_MS)
);

export const prefsDtoSchema = v.object({
	dailyTargetMs: v.nullable(v.pipe(v.number(), v.minValue(0))),
	defaultProjectId: v.nullable(idSchema)
});

export const updatePrefsDtoSchema = v.object({
	dailyTargetMs: v.optional(v.nullable(dailyTargetRequestSchema)),
	defaultProjectId: v.optional(v.nullable(idSchema))
});

export type PrefsDto = v.InferOutput<typeof prefsDtoSchema>;
export type UpdatePrefsDto = v.InferOutput<typeof updatePrefsDtoSchema>;
