import { json } from '@sveltejs/kit';
import { mockProfileDto } from '$lib/api/fixtures/load';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return json(mockProfileDto());
};
