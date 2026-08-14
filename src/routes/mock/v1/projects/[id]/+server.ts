import { json } from '@sveltejs/kit';
import { jsonError } from '$lib/api/http';
import { projectToDto, updateProjectFromDto } from '$lib/api/mappers/project';
import { isResponse, readDto, withDomainErrors } from '$lib/api/mock/respond';
import { requireMockRepo } from '$lib/api/mock/store';
import { updateProjectDtoSchema } from '$lib/api/schemas/project';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	const repo = requireMockRepo(request);
	if (isResponse(repo)) return repo;
	const project = await repo.getProject(params.id);
	if (!project) {
		return jsonError(404, 'not_found', `Project not found: ${params.id}`);
	}
	return json(projectToDto(project));
};

export const PATCH: RequestHandler = async ({ request, params }) => {
	return withDomainErrors(async () => {
		const repo = requireMockRepo(request);
		if (isResponse(repo)) return repo;
		const dto = await readDto(request, updateProjectDtoSchema);
		if (isResponse(dto)) return dto;
		const project = await repo.updateProject(params.id, updateProjectFromDto(dto));
		return json(projectToDto(project));
	});
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	return withDomainErrors(async () => {
		const repo = requireMockRepo(request);
		if (isResponse(repo)) return repo;
		await repo.deleteProject(params.id);
		return new Response(null, { status: 204 });
	});
};
