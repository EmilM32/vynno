import { afterEach, describe, expect, it } from 'vitest';
import { authStore } from './auth.svelte';

describe('authStore', () => {
	afterEach(() => {
		authStore.clearSession();
	});

	it('logs in with a trimmed email', () => {
		authStore.applySession('  emil@example.com  ');
		expect(authStore.loggedIn).toBe(true);
		expect(authStore.email).toBe('emil@example.com');
	});

	it('logs out and clears the email', () => {
		authStore.applySession('emil@example.com');
		authStore.clearSession();
		expect(authStore.loggedIn).toBe(false);
		expect(authStore.email).toBe('');
	});
});
