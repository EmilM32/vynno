import * as v from 'valibot';
import { idSchema, listSchema } from './common';

/** Contract cap for one `GET /stats/days` request, inclusive days. */
export const DAY_TOTALS_MAX_DAYS = 400;

export const dayTotalDtoSchema = v.object({
	date: v.pipe(v.string(), v.isoDate()),
	projectId: idSchema,
	activityTypeId: v.nullable(idSchema),
	durationMs: v.pipe(v.number(), v.minValue(0)),
	sessionCount: v.pipe(v.number(), v.integer(), v.minValue(0))
});

export const dayTotalListDtoSchema = listSchema(dayTotalDtoSchema);

export type DayTotalDto = v.InferOutput<typeof dayTotalDtoSchema>;
