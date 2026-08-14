import * as v from 'valibot';
import { json } from '@sveltejs/kit';
import { jsonError } from '$lib/api/http';
import { sessionToDto, startSessionFromDto } from '$lib/api/mappers/session';
import { isResponse, readDto, withDomainErrors } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import { sessionStatusSchema } from '$lib/api/schemas/common';
import { startSessionDtoSchema } from '$lib/api/schemas/session';
import type { SessionStatus } from '$lib/types/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const repo = requireMockRepo(request);
	if (isResponse(repo)) return repo;

	const statuses: SessionStatus[] = [];
	const statusRaw = url.searchParams.get('status');
	if (statusRaw) {
		for (const part of statusRaw.split(',')) {
			const token = part.trim();
			if (!token) continue;
			const parsed = v.safeParse(sessionStatusSchema, token);
			if (!parsed.success) {
				return jsonError(400, 'invalid_query', `Invalid status: ${token}`);
			}
			statuses.push(parsed.output);
		}
	}

	let limit: number | undefined;
	const limitRaw = url.searchParams.get('limit');
	if (limitRaw != null && limitRaw !== '') {
		limit = Number(limitRaw);
		if (!Number.isInteger(limit) || limit < 0) {
			return jsonError(400, 'invalid_query', 'limit must be a non-negative integer');
		}
	}

	const items = await repo.listSessions({
		...(statuses.length ? { status: statuses } : {}),
		...(limit != null ? { limit } : {})
	});
	return json({ items: items.map(sessionToDto) });
};

export const POST: RequestHandler = async ({ request }) => {
	return withDomainErrors(async () => {
		const repo = requireMockRepo(request);
		if (isResponse(repo)) return repo;
		const dto = await readDto(request, startSessionDtoSchema);
		if (isResponse(dto)) return dto;
		const session = await repo.startSession(startSessionFromDto(dto));
		return json(sessionToDto(session), { status: 201 });
	});
};
