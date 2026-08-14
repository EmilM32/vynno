import { json } from '@sveltejs/kit';
import { isResponse } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	const repo = requireMockRepo(request);
	if (isResponse(repo)) return repo;
	const count = await repo.countSessionsForProject(params.id);
	return json({ count });
};
