import { json } from '@sveltejs/kit';
import { projectToDto } from '$lib/api/mappers/project';
import { isResponse, withDomainErrors } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
	return withDomainErrors(async () => {
		const repo = requireMockRepo(request);
		if (isResponse(repo)) return repo;
		const project = await repo.archiveProject(params.id);
		return json(projectToDto(project));
	});
};
