import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { setUnauthorizedHandler } from '$lib/api/client';

export const AUTH_STORAGE_KEY = 'vynno-auth';
export const AUTH_REMEMBER_KEY = 'vynno-auth-remember';

function readStoredUsername(): string {
	if (!browser) return '';
	try {
		const remember = localStorage.getItem(AUTH_REMEMBER_KEY) !== '0';
		const store = remember ? localStorage : sessionStorage;
		return store.getItem(AUTH_STORAGE_KEY) ?? '';
	} catch {
		return '';
	}
}

function persistUsername(username: string, rememberMe: boolean): void {
	if (!browser) return;
	try {
		sessionStorage.removeItem(AUTH_STORAGE_KEY);
		localStorage.removeItem(AUTH_STORAGE_KEY);
		localStorage.removeItem(AUTH_REMEMBER_KEY);
		if (!username) return;
		const store = rememberMe ? localStorage : sessionStorage;
		store.setItem(AUTH_STORAGE_KEY, username);
		localStorage.setItem(AUTH_REMEMBER_KEY, rememberMe ? '1' : '0');
	} catch {
		// Private mode / disabled storage — in-memory flag still works.
	}
}

/**
 * Signed-in flag for chrome. The session secret is the HttpOnly cookie;
 * this only caches the username so we can skip `/login` on return.
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
		setUnauthorizedHandler(() => {
			this.clearSession();
			if (browser) {
				void goto(resolve('/login'));
			}
		});
	}

	applySession = (username: string, rememberMe = true): void => {
		this.username = username.trim();
		this.loggedIn = true;
		persistUsername(this.username, rememberMe);
	};

	clearSession = (): void => {
		this.username = '';
		this.loggedIn = false;
		persistUsername('', true);
	};
}

export const authStore = new AuthStore();
