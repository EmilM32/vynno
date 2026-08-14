/** Mock-only isolation header. Never sent when `PUBLIC_API_BASE` is a live origin. */
export const MOCK_WORKSPACE_HEADER = 'x-mock-workspace';

const GLOBAL_KEY = '__vynnoMockWorkspaceId';

type MockWorkspaceGlobal = typeof globalThis & { [GLOBAL_KEY]?: string };

/** Stable for one SPA lifetime so boot GETs and later writes share a mock store. */
export function getMockWorkspaceId(): string {
	const g = globalThis as MockWorkspaceGlobal;
	g[GLOBAL_KEY] ??= crypto.randomUUID();
	return g[GLOBAL_KEY];
}

export function resetMockWorkspaceId(): void {
	delete (globalThis as MockWorkspaceGlobal)[GLOBAL_KEY];
}
