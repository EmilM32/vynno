import * as v from 'valibot';
import { NAME_MAX, codePointLength } from '$lib/text/normalize';
import { activityColorSchema, idSchema, listSchema } from './common';

export const activityTypeNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.check((name) => codePointLength(name) >= 1 && codePointLength(name) <= NAME_MAX)
);

export const activityTypeDtoSchema = v.object({
	id: idSchema,
	name: activityTypeNameSchema,
	color: activityColorSchema
});

export const activityTypeListDtoSchema = listSchema(activityTypeDtoSchema);

export const createActivityTypeDtoSchema = v.object({
	name: v.string(),
	color: activityColorSchema
});

export const updateActivityTypeDtoSchema = v.object({
	name: v.optional(v.string()),
	color: v.optional(activityColorSchema)
});

export type ActivityTypeDto = v.InferOutput<typeof activityTypeDtoSchema>;
export type ActivityTypeListDto = v.InferOutput<typeof activityTypeListDtoSchema>;
export type CreateActivityTypeDto = v.InferOutput<typeof createActivityTypeDtoSchema>;
export type UpdateActivityTypeDto = v.InferOutput<typeof updateActivityTypeDtoSchema>;
