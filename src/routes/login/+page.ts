import { redirect } from '@sveltejs/kit';
import { authStore } from '$lib/stores/auth.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	if (authStore.loggedIn) {
		redirect(307, '/dashboard');
	}
};
