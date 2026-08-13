import { mockProjectListDto } from '$lib/api/fixtures/load';
import { jsonError } from '$lib/api/http';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const project = mockProjectListDto().items.find((p) => p.id === params.id);
	if (!project) {
		return jsonError(404, 'not_found', `Project not found: ${params.id}`);
	}
	return json(project);
};
