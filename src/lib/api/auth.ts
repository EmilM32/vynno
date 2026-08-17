import { ApiClient, type FetchFn } from './client';
import { getApiBase } from './config';
import { apiPaths } from './paths';
import { authResponseSchema, type AuthResponse } from './schemas/auth';

export async function loginRequest(
	username: string,
	password: string,
	rememberMe: boolean,
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): Promise<AuthResponse> {
	const client = new ApiClient(fetchFn, base);
	return client.post(apiPaths.authLogin(), { username, password, rememberMe }, authResponseSchema);
}

export async function registerRequest(
	username: string,
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
			username,
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
