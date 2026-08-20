import * as v from 'valibot';
import { activityColorSchema, idSchema, listSchema } from './common';

export const activityTypeNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80));

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
