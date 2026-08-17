import { afterEach, describe, expect, it } from 'vitest';
import { authStore } from './auth.svelte';

describe('authStore', () => {
	afterEach(() => {
		authStore.clearSession();
	});

	it('logs in with a trimmed username', () => {
		authStore.applySession('  emil  ');
		expect(authStore.loggedIn).toBe(true);
		expect(authStore.username).toBe('emil');
	});

	it('logs out and clears the username', () => {
		authStore.applySession('emil');
		authStore.clearSession();
		expect(authStore.loggedIn).toBe(false);
		expect(authStore.username).toBe('');
	});
});
