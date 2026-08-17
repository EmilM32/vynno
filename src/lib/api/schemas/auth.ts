import * as v from 'valibot';
import { profileDtoSchema } from './profile';

export const loginDtoSchema = v.object({
	username: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1)),
	rememberMe: v.optional(v.boolean())
});

export const registerDtoSchema = v.object({
	username: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1)),
	displayName: v.optional(v.string()),
	rememberMe: v.optional(v.boolean())
});

export const authResponseSchema = v.object({
	profile: profileDtoSchema
});

export type LoginDto = v.InferOutput<typeof loginDtoSchema>;
export type RegisterDto = v.InferOutput<typeof registerDtoSchema>;
export type AuthResponse = v.InferOutput<typeof authResponseSchema>;
