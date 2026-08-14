import { fixtureAppSeed } from '$lib/api/fixtures/load';
import { MOCK_WORKSPACE_HEADER } from '$lib/api/mock-workspace';
import { jsonError } from '$lib/api/http';
import { MemoryTimeTrackingRepository } from '$lib/data/memory-repository';

const MAX_WORKSPACES = 50;

type Entry = { repo: MemoryTimeTrackingRepository; touched: number };

const workspaces = new Map<string, Entry>();

export function getMockRepo(workspaceId: string): MemoryTimeTrackingRepository {
	let entry = workspaces.get(workspaceId);
	if (!entry) {
		if (workspaces.size >= MAX_WORKSPACES) evictOldest();
		entry = {
			repo: new MemoryTimeTrackingRepository(fixtureAppSeed()),
			touched: Date.now()
		};
		workspaces.set(workspaceId, entry);
	} else {
		entry.touched = Date.now();
	}
	return entry.repo;
}

/** Resolve the mock repo for this request, or a 400 if the isolation header is missing. */
export function requireMockRepo(request: Request): MemoryTimeTrackingRepository | Response {
	const id = request.headers.get(MOCK_WORKSPACE_HEADER)?.trim();
	if (!id) {
		return jsonError(400, 'invalid_query', `Missing ${MOCK_WORKSPACE_HEADER} header`);
	}
	return getMockRepo(id);
}

export function resetMockWorkspaces(): void {
	workspaces.clear();
}

export function mockWorkspaceCount(): number {
	return workspaces.size;
}

function evictOldest(): void {
	let oldestKey: string | undefined;
	let oldest = Infinity;
	for (const [key, entry] of workspaces) {
		if (entry.touched < oldest) {
			oldest = entry.touched;
			oldestKey = key;
		}
	}
	if (oldestKey) workspaces.delete(oldestKey);
}
