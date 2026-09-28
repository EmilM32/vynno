import { formatSessionCount } from '$lib/components/projects/session-count';
import { m } from '$lib/paraglide/messages.js';
import { formatRelativePast } from '$lib/time/duration';

export interface HeaderMetaInput {
	/** Latest stopped `startedAt` among loaded sessions of this project. */
	lastLogged: string | undefined;
	/** Every session page is loaded, so "none loaded" means none exist. */
	historyComplete: boolean;
	/** Lazy per-project count; `undefined` until known. */
	sessionCount: number | undefined;
	nowMs: number;
}

/**
 * Dossier header line. Sessions arrive newest-first, so a loaded one is the latest;
 * none loaded proves nothing until history is complete or the count is 0 (EMI-80).
 */
export function projectHeaderMeta(input: HeaderMetaInput): string {
	if (input.lastLogged) {
		return m.project_last_logged({ when: formatRelativePast(input.lastLogged, input.nowMs) });
	}
	if (input.historyComplete || input.sessionCount === 0) return m.project_no_sessions();
	return formatSessionCount(input.sessionCount) ?? '';
}
