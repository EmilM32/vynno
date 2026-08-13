import * as v from 'valibot';

export const profileDtoSchema = v.object({
	displayName: v.pipe(v.string(), v.minLength(1)),
	handle: v.pipe(v.string(), v.minLength(1)),
	avatarUrl: v.nullable(v.string())
});

export type ProfileDto = v.InferOutput<typeof profileDtoSchema>;
