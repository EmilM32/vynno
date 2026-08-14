import * as v from 'valibot';
import { apiUrl, getApiBase, isMockApi } from './config';
import { ApiError } from './errors';
import { getMockWorkspaceId, MOCK_WORKSPACE_HEADER } from './mock-workspace';
import { errorEnvelopeSchema } from './schemas/common';

export type FetchFn = typeof globalThis.fetch;

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

	async delete(path: string): Promise<void> {
		await this.request(path, { method: 'DELETE' }, null);
	}

	private async request<T>(
		path: string,
		init: RequestInit,
		schema: v.GenericSchema<unknown, T> | null
	): Promise<T> {
		const headers = new Headers(init.headers);
		if (init.body != null && !headers.has('content-type')) {
			headers.set('content-type', 'application/json');
		}
		if (isMockApi(this.baseUrl ?? getApiBase()) && !headers.has(MOCK_WORKSPACE_HEADER)) {
			headers.set(MOCK_WORKSPACE_HEADER, getMockWorkspaceId());
		}

		const response = await this.fetchFn(apiUrl(path, this.baseUrl), {
			...init,
			headers
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
