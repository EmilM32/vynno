import { browser } from '$app/environment';

export const AUTH_STORAGE_KEY = 'vynno-auth';

function readStoredUsername(): string {
	if (!browser) return '';
	try {
		return sessionStorage.getItem(AUTH_STORAGE_KEY) ?? '';
	} catch {
		return '';
	}
}

function persistUsername(username: string): void {
	if (!browser) return;
	try {
		if (username) sessionStorage.setItem(AUTH_STORAGE_KEY, username);
		else sessionStorage.removeItem(AUTH_STORAGE_KEY);
	} catch {
		// Private mode / disabled storage — in-memory flag still works.
	}
}

/**
 * Stub session for the login view. Any non-empty username is accepted;
 * nothing is sent to an API. Cleared when the tab closes (sessionStorage).
 */
class AuthStore {
	loggedIn = $state(false);
	username = $state('');

	constructor() {
		const stored = readStoredUsername();
		if (stored) {
			this.username = stored;
			this.loggedIn = true;
		}
	}

	login = (username: string): void => {
		this.username = username.trim();
		this.loggedIn = true;
		persistUsername(this.username);
	};

	logout = (): void => {
		this.username = '';
		this.loggedIn = false;
		persistUsername('');
	};
}

export const authStore = new AuthStore();
