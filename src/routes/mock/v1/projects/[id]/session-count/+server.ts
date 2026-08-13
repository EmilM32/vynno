import { mockSessionDtos } from '$lib/api/fixtures/load';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const count = mockSessionDtos().filter((s) => s.projectId === params.id).length;
	return json({ count });
};
