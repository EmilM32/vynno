import { json } from '@sveltejs/kit';
import { sessionToDto } from '$lib/api/mappers/session';
import { isResponse, withDomainErrors } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
	return withDomainErrors(async () => {
		const repo = requireMockRepo(request);
		if (isResponse(repo)) return repo;
		const session = await repo.stopSession(params.id);
		return json(sessionToDto(session));
	});
};
