import { mockSessionDtos } from '$lib/api/fixtures/load';
import { jsonError } from '$lib/api/http';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const session = mockSessionDtos().find((s) => s.id === params.id);
	if (!session) {
		return jsonError(404, 'not_found', `Session not found: ${params.id}`);
	}
	return json(session);
};
