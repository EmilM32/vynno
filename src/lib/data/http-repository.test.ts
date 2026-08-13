import { describe, expect, it, vi } from 'vitest';
import { PROJECT_IDS } from '$lib/api/fixtures/ids';
import { mockProfileDto, mockProjectListDto, mockSessionDtos } from '$lib/api/fixtures/load';
import { sessionToDto } from '$lib/api/mappers/session';
import { FIXED_NOW } from '$lib/test/factories';
import { HttpTimeTrackingRepository } from './http-repository';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(body == null ? null : JSON.stringify(body), {
		status,
		headers: body == null ? undefined : { 'content-type': 'application/json' }
	});
}

describe('HttpTimeTrackingRepository', () => {
	it('lists and maps projects', async () => {
		const fetchFn = vi.fn().mockResolvedValue(jsonResponse(mockProjectListDto()));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, '/mock/v1');
		const projects = await repo.listProjects({ includeArchived: true });
		expect(projects[0]?.id).toBe(PROJECT_IDS.auth);
		expect(projects[0]?.isArchived).toBe(false);
		expect(String(fetchFn.mock.calls[0]?.[0])).toBe('/mock/v1/projects?includeArchived=true');
	});

	it('returns null for a missing active session', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ error: { code: 'session_not_active', message: 'No active session' } }, 404)
			);
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, '/mock/v1');
		expect(await repo.getActiveSession()).toBeNull();
	});

	it('returns undefined for a missing project', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(jsonResponse({ error: { code: 'not_found', message: 'gone' } }, 404));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, '/mock/v1');
		expect(await repo.getProject('nope')).toBeUndefined();
	});

	it('starts a session via POST', async () => {
		const created = {
			...sessionToDto({
				id: 'sess-new',
				projectId: PROJECT_IDS.auth,
				note: 'New work',
				status: 'active',
				startedAt: FIXED_NOW.toISOString(),
				pausedMs: 0
			})
		};
		const fetchFn = vi.fn().mockResolvedValue(jsonResponse(created, 201));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, '/mock/v1');
		const session = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'New work' });
		expect(session.id).toBe('sess-new');
		expect(session.status).toBe('active');
		expect(fetchFn).toHaveBeenCalledWith(
			'/mock/v1/sessions',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('reads profile and session list', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) return jsonResponse(mockProfileDto());
			if (url.includes('/sessions')) return jsonResponse({ items: mockSessionDtos(FIXED_NOW) });
			return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
		});
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, '/mock/v1');
		expect((await repo.getProfile()).handle).toBe('@alexdev');
		const sessions = await repo.listSessions({ status: ['stopped'], limit: 2 });
		expect(String(fetchFn.mock.calls[1]?.[0])).toBe('/mock/v1/sessions?status=stopped&limit=2');
		expect(sessions.length).toBeGreaterThan(0);
	});

	it('deletes a project with 204', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, '/mock/v1');
		await expect(repo.deleteProject('proj-x')).resolves.toBeUndefined();
		expect(String(fetchFn.mock.calls[0]?.[0])).toBe('/mock/v1/projects/proj-x');
	});
});
