import * as v from 'valibot';
import { json } from '@sveltejs/kit';
import { mockSessionDtos } from '$lib/api/fixtures/load';
import { jsonError } from '$lib/api/http';
import { sessionStatusSchema } from '$lib/api/schemas/common';
import type { SessionStatus } from '$lib/types/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	let items = [...mockSessionDtos()].sort(
		(a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
	);

	const statusRaw = url.searchParams.get('status');
	if (statusRaw) {
		const statuses: SessionStatus[] = [];
		for (const part of statusRaw.split(',')) {
			const token = part.trim();
			if (!token) continue;
			const parsed = v.safeParse(sessionStatusSchema, token);
			if (!parsed.success) {
				return jsonError(400, 'invalid_query', `Invalid status: ${token}`);
			}
			statuses.push(parsed.output);
		}
		if (statuses.length) {
			const set = new Set(statuses);
			items = items.filter((s) => set.has(s.status));
		}
	}

	const limitRaw = url.searchParams.get('limit');
	if (limitRaw != null && limitRaw !== '') {
		const limit = Number(limitRaw);
		if (!Number.isInteger(limit) || limit < 0) {
			return jsonError(400, 'invalid_query', 'limit must be a non-negative integer');
		}
		items = items.slice(0, limit);
	}

	return json({ items });
};
