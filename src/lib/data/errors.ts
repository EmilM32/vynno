/** Domain / mock-engine error with a contract `code`. */
export type DomainErrorCode =
	| 'not_found'
	| 'session_already_active'
	| 'session_not_active'
	| 'project_archived'
	| 'code_in_use'
	| 'name_in_use'
	| 'last_active_project'
	| 'project_has_sessions'
	| 'activity_type_has_sessions'
	| 'invalid_transition'
	| 'invalid_body';

export class DomainError extends Error {
	readonly code: DomainErrorCode;

	constructor(code: DomainErrorCode, message: string) {
		super(message);
		this.name = 'DomainError';
		this.code = code;
	}
}

export function statusForCode(code: string): number {
	switch (code) {
		case 'not_found':
		case 'session_not_active':
			return 404;
		case 'session_already_active':
		case 'project_archived':
		case 'code_in_use':
		case 'name_in_use':
		case 'last_active_project':
		case 'project_has_sessions':
		case 'activity_type_has_sessions':
		case 'invalid_transition':
			return 409;
		case 'invalid_body':
		case 'invalid_query':
		case 'invalid_json':
			return 400;
		default:
			return 400;
	}
}
