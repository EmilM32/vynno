import * as v from 'valibot';
import { apiUrl, getApiBase } from './config';
import { ApiError } from './errors';
import { errorEnvelopeSchema } from './schemas/common';

export type FetchFn = typeof globalThis.fetch;

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
	unauthorizedHandler = handler;
}

export class ApiClient {
	constructor(
		private readonly fetchFn: FetchFn,
		private readonly baseUrl?: string
	) {}

	get<T>(path: string, schema: v.GenericSchema<unknown, T>): Promise<T> {
		return this.request(path, { method: 'GET' }, schema);
	}

	post<T>(path: string, body: unknown, schema: v.GenericSchema<unknown, T>): Promise<T> {
		return this.request(path, { method: 'POST', body: JSON.stringify(body) }, schema);
	}

	patch<T>(path: string, body: unknown, schema: v.GenericSchema<unknown, T>): Promise<T> {
		return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }, schema);
	}

	putFile<T>(path: string, file: Blob, schema: v.GenericSchema<unknown, T>): Promise<T> {
		const body = new FormData();
		body.append('file', file);
		return this.request(path, { method: 'PUT', body }, schema);
	}

	async postNoContent(path: string, body?: unknown): Promise<void> {
		await this.request(
			path,
			{ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) },
			null
		);
	}

	async delete(path: string): Promise<void> {
		await this.request(path, { method: 'DELETE' }, null);
	}

	deleteJson<T>(path: string, schema: v.GenericSchema<unknown, T>): Promise<T> {
		return this.request(path, { method: 'DELETE' }, schema);
	}

	private async request<T>(
		path: string,
		init: RequestInit,
		schema: v.GenericSchema<unknown, T> | null
	): Promise<T> {
		const headers = new Headers(init.headers);
		if (init.body != null && !headers.has('content-type') && !(init.body instanceof FormData)) {
			headers.set('content-type', 'application/json');
		}

		const response = await this.fetchFn(apiUrl(path, this.baseUrl ?? getApiBase()), {
			...init,
			headers,
			credentials: 'include'
		});

		const text = await response.text();
		let data: unknown = null;
		if (text) {
			try {
				data = JSON.parse(text);
			} catch {
				throw new ApiError(response.status, 'invalid_json', 'Response was not JSON');
			}
		}

		if (!response.ok) {
			const parsed = v.safeParse(errorEnvelopeSchema, data);
			if (parsed.success) {
				if (parsed.output.error.code === 'unauthorized') {
					unauthorizedHandler?.();
				}
				throw new ApiError(response.status, parsed.output.error.code, parsed.output.error.message);
			}
			throw new ApiError(
				response.status,
				'http_error',
				response.statusText || `Request failed (${response.status})`
			);
		}

		if (!schema) {
			return undefined as T;
		}

		const parsed = v.safeParse(schema, data);
		if (!parsed.success) {
			throw new ApiError(
				response.status,
				'invalid_response',
				'Response did not match the API contract'
			);
		}
		return parsed.output;
	}
}
