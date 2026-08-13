import { json } from '@sveltejs/kit';
import { mockProjectListDto } from '$lib/api/fixtures/load';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const includeArchived = url.searchParams.get('includeArchived') === 'true';
	const items = mockProjectListDto().items.filter((p) => includeArchived || !p.archived);
	return json({ items });
};
