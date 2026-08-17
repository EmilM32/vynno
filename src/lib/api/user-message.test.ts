import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { DomainError } from '$lib/data/errors';
import { userMessageForError } from './user-message';

describe('userMessageForError', () => {
	it('maps contract codes to UI strings', () => {
		expect(userMessageForError(new ApiError(409, 'session_already_active', 'x'), () => 'fb')).toBe(
			'Stop the current session before starting a new one.'
		);
		expect(userMessageForError(new DomainError('code_in_use', 'x'), () => 'fb')).toBe(
			'That project code is already in use.'
		);
		expect(userMessageForError(new ApiError(409, 'last_active_project', 'x'), () => 'fb')).toBe(
			'Cannot archive or delete the last remaining active project.'
		);
		expect(userMessageForError(new ApiError(401, 'unauthorized', 'x'), () => 'fb')).toBe(
			'Please sign in again.'
		);
		expect(userMessageForError(new ApiError(401, 'invalid_credentials', 'x'), () => 'fb')).toBe(
			'Username or password is incorrect.'
		);
		expect(userMessageForError(new ApiError(409, 'username_in_use', 'x'), () => 'fb')).toBe(
			'That username is already taken.'
		);
	});

	it('falls back for unknown errors', () => {
		expect(userMessageForError(new Error('nope'), () => 'fallback')).toBe('fallback');
		expect(
			userMessageForError(new ApiError(409, 'invalid_transition', 'x'), () => 'fallback')
		).toBe('fallback');
	});
});
