import { ApiClient, type FetchFn } from './client';
import { getApiBase } from './config';
import { apiPaths } from './paths';
import { authResponseSchema, type AuthResponse } from './schemas/auth';

export async function loginRequest(
	email: string,
	password: string,
	rememberMe: boolean,
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<AuthResponse> {
	const client = new ApiClient(fetchFn, base);
	return client.post(apiPaths.authLogin(), { email, password, rememberMe }, authResponseSchema);
}

export async function requestRegisterCode(
	email: string,
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<void> {
	const client = new ApiClient(fetchFn, base);
	await client.postNoContent(apiPaths.authRegisterCode(), { email });
}

export async function registerRequest(
	email: string,
	password: string,
	rememberMe: boolean,
	code: string,
	displayName?: string,
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<AuthResponse> {
	const client = new ApiClient(fetchFn, base);
	const trimmedName = displayName?.trim();
	return client.post(
		apiPaths.authRegister(),
		{
			email,
			password,
			code,
			rememberMe,
			...(trimmedName ? { displayName: trimmedName } : {})
		},
		authResponseSchema
	);
}

export async function requestPasswordReset(
	email: string,
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<void> {
	const client = new ApiClient(fetchFn, base);
	await client.postNoContent(apiPaths.authPasswordForgot(), { email });
}

export async function resetPasswordRequest(
	email: string,
	code: string,
	password: string,
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<void> {
	const client = new ApiClient(fetchFn, base);
	await client.postNoContent(apiPaths.authPasswordReset(), { email, code, password });
}

export async function logoutRequest(
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<void> {
	const client = new ApiClient(fetchFn, base);
	await client.postNoContent(apiPaths.authLogout());
}
