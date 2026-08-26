import { describe, expect, it, vi } from 'vitest';
import { sessionToDto } from '$lib/api/mappers/session';
import {
	FIXED_NOW,
	PROJECT_IDS,
	sampleProfileDto,
	sampleProjectListDto
} from '$lib/test/factories';
import { HttpTimeTrackingRepository } from './http-repository';

const api = 'https://api.example.test/v1';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(body == null ? null : JSON.stringify(body), {
		status,
		headers: body == null ? undefined : { 'content-type': 'application/json' }
	});
}

describe('HttpTimeTrackingRepository', () => {
	it('lists and maps projects', async () => {
		const fetchFn = vi.fn().mockResolvedValue(jsonResponse(sampleProjectListDto()));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		const projects = await repo.listProjects({ includeArchived: true });
		expect(projects[0]?.id).toBe(PROJECT_IDS.auth);
		expect(projects[0]?.isArchived).toBe(false);
		expect(String(fetchFn.mock.calls[0]?.[0])).toBe(`${api}/projects?includeArchived=true`);
	});

	it('returns null for a missing active session', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ error: { code: 'session_not_active', message: 'No active session' } }, 404)
			);
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		expect(await repo.getActiveSession()).toBeNull();
	});

	it('returns undefined for a missing project', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(jsonResponse({ error: { code: 'not_found', message: 'gone' } }, 404));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		expect(await repo.getProject('nope')).toBeUndefined();
	});

	it('patches, deletes, and creates a manual session', async () => {
		const stopped = sessionToDto({
			id: 'sess-edit',
			projectId: PROJECT_IDS.auth,
			note: 'Edited',
			status: 'stopped',
			startedAt: FIXED_NOW.toISOString(),
			endedAt: new Date(FIXED_NOW.getTime() + 60_000).toISOString(),
			pausedMs: 0
		});
		const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? 'GET';
			if (method === 'PATCH' && url.endsWith('/sessions/sess-edit')) {
				return jsonResponse(stopped);
			}
			if (method === 'DELETE' && url.endsWith('/sessions/sess-edit')) {
				return jsonResponse(null, 204);
			}
			if (method === 'POST' && url.endsWith('/sessions/manual')) {
				return jsonResponse(stopped, 201);
			}
			return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
		});
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		expect((await repo.updateSession('sess-edit', { note: 'Edited' })).note).toBe('Edited');
		await repo.deleteSession('sess-edit');
		const created = await repo.createManualSession({
			projectId: PROJECT_IDS.auth,
			note: 'Forgot',
			startedAt: FIXED_NOW.toISOString(),
			endedAt: new Date(FIXED_NOW.getTime() + 60_000).toISOString()
		});
		expect(created.id).toBe('sess-edit');
		expect(String(fetchFn.mock.calls[2]?.[0])).toBe(`${api}/sessions/manual`);
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
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		const session = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'New work' });
		expect(session.id).toBe('sess-new');
		expect(session.status).toBe('active');
		expect(fetchFn).toHaveBeenCalledWith(
			`${api}/sessions`,
			expect.objectContaining({ method: 'POST', credentials: 'include' })
		);
	});

	it('reads profile and session list', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) return jsonResponse(sampleProfileDto());
			if (url.includes('/sessions')) return jsonResponse({ items: [], nextCursor: null });
			return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
		});
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		expect((await repo.getProfile()).email).toBe('alexdev@vynno.local');
		await repo.listSessions({ status: ['stopped'], limit: 2, cursor: 'abc' });
		expect(String(fetchFn.mock.calls[1]?.[0])).toBe(
			`${api}/sessions?status=stopped&limit=2&cursor=abc`
		);
	});

	it('updates profile and uploads an avatar', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.endsWith('/me') && init?.method === 'PATCH') {
				return jsonResponse({ displayName: 'Renamed', email: 'alexdev@vynno.local', avatarUrl: null });
			}
			if (url.endsWith('/me/avatar') && init?.method === 'PUT') {
				return jsonResponse({
					displayName: 'Renamed',
					email: 'alexdev@vynno.local',
					avatarUrl: 'https://api.example.test/v1/avatars/abc'
				});
			}
			if (url.endsWith('/me/avatar') && init?.method === 'DELETE') {
				return jsonResponse({ displayName: 'Renamed', email: 'alexdev@vynno.local', avatarUrl: null });
			}
			return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
		});
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		expect((await repo.updateProfile({ displayName: 'Renamed' })).displayName).toBe('Renamed');
		const uploaded = await repo.uploadAvatar(new Blob([new Uint8Array([0xff, 0xd8, 0xff])]));
		expect(uploaded.avatarUrl).toBe('https://api.example.test/v1/avatars/abc');
		expect((await repo.deleteAvatar()).avatarUrl).toBeUndefined();
	});

	it('deletes a project with 204', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		const repo = HttpTimeTrackingRepository.fromFetch(fetchFn, api);
		await expect(repo.deleteProject('proj-x')).resolves.toBeUndefined();
		expect(String(fetchFn.mock.calls[0]?.[0])).toBe(`${api}/projects/proj-x`);
	});
});
