import { mockSessionDtos } from '$lib/api/fixtures/load';
import { jsonError } from '$lib/api/http';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const session = mockSessionDtos().find((s) => s.status === 'active' || s.status === 'paused');
	if (!session) {
		return jsonError(404, 'session_not_active', 'No active session');
	}
	return json(session);
};
