import * as v from 'valibot';
import { hexColorSchema, idSchema, listSchema } from './common';

export const projectDtoSchema = v.object({
	id: idSchema,
	name: v.pipe(v.string(), v.minLength(1)),
	color: hexColorSchema,
	code: v.nullable(v.string()),
	progressPercent: v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
	archived: v.boolean(),
	createdAt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
	updatedAt: v.optional(v.pipe(v.string(), v.isoTimestamp()))
});

export const projectListDtoSchema = listSchema(projectDtoSchema);

export const createProjectDtoSchema = v.object({
	name: v.string(),
	color: hexColorSchema,
	code: v.optional(v.nullable(v.string()))
});

export const updateProjectDtoSchema = v.object({
	name: v.optional(v.string()),
	color: v.optional(hexColorSchema),
	code: v.optional(v.nullable(v.string()))
});

export type ProjectDto = v.InferOutput<typeof projectDtoSchema>;
export type ProjectListDto = v.InferOutput<typeof projectListDtoSchema>;
export type CreateProjectDto = v.InferOutput<typeof createProjectDtoSchema>;
export type UpdateProjectDto = v.InferOutput<typeof updateProjectDtoSchema>;
