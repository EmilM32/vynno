import { json } from '@sveltejs/kit';
import { createProjectFromDto, projectToDto } from '$lib/api/mappers/project';
import { isResponse, readDto, withDomainErrors } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import { createProjectDtoSchema } from '$lib/api/schemas/project';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const repo = requireMockRepo(request);
	if (isResponse(repo)) return repo;
	const includeArchived = url.searchParams.get('includeArchived') === 'true';
	const items = await repo.listProjects({ includeArchived });
	return json({ items: items.map(projectToDto) });
};

export const POST: RequestHandler = async ({ request }) => {
	return withDomainErrors(async () => {
		const repo = requireMockRepo(request);
		if (isResponse(repo)) return repo;
		const dto = await readDto(request, createProjectDtoSchema);
		if (isResponse(dto)) return dto;
		const project = await repo.createProject(createProjectFromDto(dto));
		return json(projectToDto(project), { status: 201 });
	});
};
