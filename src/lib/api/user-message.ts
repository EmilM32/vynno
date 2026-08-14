import { m } from '$lib/paraglide/messages.js';
import { ApiError } from './errors';
import { DomainError } from '$lib/data/errors';

/** Map a contract / domain error code to an existing UI string. */
export function userMessageForError(e: unknown, fallback: () => string): string {
	const code = e instanceof ApiError || e instanceof DomainError ? e.code : null;
	switch (code) {
		case 'session_already_active':
			return m.error_stop_before_start();
		case 'session_not_active':
		case 'not_found':
			return m.error_not_found();
		case 'project_archived':
			return m.error_project_archived();
		case 'code_in_use':
			return m.error_code_in_use();
		case 'last_active_project':
			return m.error_last_active_project();
		case 'project_has_sessions':
			return m.projects_cannot_delete_has_sessions();
		case 'invalid_response':
		case 'invalid_json':
			return m.error_invalid_response();
		default:
			return fallback();
	}
}
