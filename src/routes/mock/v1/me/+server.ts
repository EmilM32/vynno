import { json } from '@sveltejs/kit';
import { profileToDto } from '$lib/api/mappers/profile';
import { isResponse } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const repo = requireMockRepo(request);
	if (isResponse(repo)) return repo;
	return json(profileToDto(await repo.getProfile()));
};
