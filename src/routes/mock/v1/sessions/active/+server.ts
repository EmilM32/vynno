import { json } from '@sveltejs/kit';
import { jsonError } from '$lib/api/http';
import { sessionToDto } from '$lib/api/mappers/session';
import { isResponse } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const repo = requireMockRepo(request);
	if (isResponse(repo)) return repo;
	const session = await repo.getActiveSession();
	if (!session) {
		return jsonError(404, 'session_not_active', 'No active session');
	}
	return json(sessionToDto(session));
};
