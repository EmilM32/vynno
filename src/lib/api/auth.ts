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

export async function registerRequest(
	email: string,
	password: string,
	rememberMe: boolean,
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
			rememberMe,
			...(trimmedName ? { displayName: trimmedName } : {})
		},
		authResponseSchema
	);
}

export async function logoutRequest(
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<void> {
	const client = new ApiClient(fetchFn, base);
	await client.postNoContent(apiPaths.authLogout());
}
