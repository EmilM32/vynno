import { afterEach, describe, expect, it } from 'vitest';
import { PROJECT_IDS } from '$lib/api/fixtures/ids';
import { MOCK_WORKSPACE_HEADER } from '$lib/api/mock-workspace';
import { getMockRepo, mockWorkspaceCount, requireMockRepo, resetMockWorkspaces } from './store';

afterEach(() => {
	resetMockWorkspaces();
});

describe('mock workspace store', () => {
	it('seeds each workspace once and shares mutations', async () => {
		const a = getMockRepo('ws-a');
		const again = getMockRepo('ws-a');
		expect(again).toBe(a);

		const started = await a.startSession({ projectId: PROJECT_IDS.auth, note: 'Shared' });
		expect((await again.getActiveSession())?.id).toBe(started.id);
	});

	it('isolates two workspace ids', async () => {
		const a = getMockRepo('ws-a');
		const b = getMockRepo('ws-b');
		await a.startSession({ projectId: PROJECT_IDS.auth, note: 'Only A' });
		expect(await b.getActiveSession()).toBeNull();
		expect(mockWorkspaceCount()).toBe(2);
	});

	it('requires the isolation header', async () => {
		const missing = requireMockRepo(new Request('http://localhost/mock/v1/sessions'));
		expect(missing).toBeInstanceOf(Response);
		expect((missing as Response).status).toBe(400);

		const ok = requireMockRepo(
			new Request('http://localhost/mock/v1/sessions', {
				headers: { [MOCK_WORKSPACE_HEADER]: 'ws-test' }
			})
		);
		expect(ok).not.toBeInstanceOf(Response);
	});
});
