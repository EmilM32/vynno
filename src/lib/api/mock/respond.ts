import * as v from 'valibot';
import { jsonError } from '$lib/api/http';
import { DomainError, statusForCode } from '$lib/data/errors';

export async function withDomainErrors(fn: () => Promise<Response>): Promise<Response> {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof DomainError) {
			return jsonError(statusForCode(e.code), e.code, e.message);
		}
		throw e;
	}
}

export async function readDto<T>(
	request: Request,
	schema: v.GenericSchema<unknown, T>
): Promise<T | Response> {
	let data: unknown;
	try {
		const text = await request.text();
		data = text ? JSON.parse(text) : {};
	} catch {
		return jsonError(400, 'invalid_json', 'Request body was not JSON');
	}

	const parsed = v.safeParse(schema, data);
	if (!parsed.success) {
		return jsonError(400, 'invalid_body', 'Request body did not match the API contract');
	}
	return parsed.output;
}

export function isResponse(value: unknown): value is Response {
	return value instanceof Response;
}
