import * as v from 'valibot';
import { profileDtoSchema } from './profile';

export const loginDtoSchema = v.object({
	email: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1)),
	rememberMe: v.optional(v.boolean())
});

export const registerDtoSchema = v.object({
	email: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1)),
	code: v.pipe(v.string(), v.regex(/^\d{6}$/)),
	displayName: v.optional(v.string()),
	rememberMe: v.optional(v.boolean())
});

export const resetPasswordDtoSchema = v.object({
	email: v.pipe(v.string(), v.minLength(1)),
	code: v.pipe(v.string(), v.regex(/^\d{6}$/)),
	password: v.pipe(v.string(), v.minLength(1))
});

export const changePasswordDtoSchema = v.object({
	currentPassword: v.pipe(v.string(), v.minLength(1)),
	newPassword: v.pipe(v.string(), v.minLength(1))
});

export const emailChangeCodeDtoSchema = v.object({
	email: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1))
});

export const changeEmailDtoSchema = v.object({
	email: v.pipe(v.string(), v.minLength(1)),
	code: v.pipe(v.string(), v.regex(/^\d{6}$/))
});

export const authResponseSchema = v.object({
	profile: profileDtoSchema
});

export type LoginDto = v.InferOutput<typeof loginDtoSchema>;
export type RegisterDto = v.InferOutput<typeof registerDtoSchema>;
export type ResetPasswordDto = v.InferOutput<typeof resetPasswordDtoSchema>;
export type AuthResponse = v.InferOutput<typeof authResponseSchema>;
export type ChangePasswordDto = v.InferOutput<typeof changePasswordDtoSchema>;
export type EmailChangeCodeDto = v.InferOutput<typeof emailChangeCodeDtoSchema>;
export type ChangeEmailDto = v.InferOutput<typeof changeEmailDtoSchema>;
