import { afterEach, describe, expect, it } from 'vitest';
import { authStore } from './auth.svelte';

describe('authStore', () => {
	afterEach(() => {
		authStore.logout();
	});

	it('logs in with a trimmed username', () => {
		authStore.login('  emil  ');
		expect(authStore.loggedIn).toBe(true);
		expect(authStore.username).toBe('emil');
	});

	it('logs out and clears the username', () => {
		authStore.login('emil');
		authStore.logout();
		expect(authStore.loggedIn).toBe(false);
		expect(authStore.username).toBe('');
	});
});
