import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { setUnauthorizedHandler } from '$lib/api/client';
import { resetClientPrefsStore } from '$lib/stores/prefs.svelte';
import { resetClientSessionStore } from '$lib/stores/session.svelte';

export const AUTH_STORAGE_KEY = 'vynno-auth';
export const AUTH_REMEMBER_KEY = 'vynno-auth-remember';

function readStoredEmail(): string {
	if (!browser) return '';
	try {
		const store = readRemember() ? localStorage : sessionStorage;
		return store.getItem(AUTH_STORAGE_KEY) ?? '';
	} catch {
		return '';
	}
}

function readRemember(): boolean {
	if (!browser) return true;
	try {
		return localStorage.getItem(AUTH_REMEMBER_KEY) !== '0';
	} catch {
		return true;
	}
}

function persistEmail(email: string, rememberMe: boolean): void {
	if (!browser) return;
	try {
		sessionStorage.removeItem(AUTH_STORAGE_KEY);
		localStorage.removeItem(AUTH_STORAGE_KEY);
		localStorage.removeItem(AUTH_REMEMBER_KEY);
		if (!email) return;
		const store = rememberMe ? localStorage : sessionStorage;
		store.setItem(AUTH_STORAGE_KEY, email);
		localStorage.setItem(AUTH_REMEMBER_KEY, rememberMe ? '1' : '0');
	} catch {
		// Private mode / disabled storage — in-memory flag still works.
	}
}

/**
 * Signed-in flag for chrome. The session secret is the HttpOnly cookie;
 * this only caches the email so we can skip `/login` on return.
 */
class AuthStore {
	loggedIn = $state(false);
	email = $state('');

	constructor() {
		const stored = readStoredEmail();
		if (stored) {
			this.email = stored;
			this.loggedIn = true;
		}
		setUnauthorizedHandler(() => {
			this.clearSession();
			if (browser) {
				void goto(resolve('/login'), { invalidateAll: true });
			}
		});
	}

	applySession = (email: string, rememberMe = true): void => {
		this.email = email.trim();
		this.loggedIn = true;
		persistEmail(this.email, rememberMe);
	};

	/** The same session under a new sign-in email. Keeps the remember-me choice. */
	updateEmail = (email: string): void => {
		if (!this.loggedIn) return;
		this.email = email.trim();
		persistEmail(this.email, readRemember());
	};

	clearSession = (): void => {
		this.email = '';
		this.loggedIn = false;
		persistEmail('', true);
		resetClientSessionStore();
		resetClientPrefsStore();
	};
}

export const authStore = new AuthStore();
