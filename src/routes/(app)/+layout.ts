import { redirect } from '@sveltejs/kit';
import { authStore } from '$lib/stores/auth.svelte';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
	if (!authStore.loggedIn) {
		redirect(307, '/login');
	}
	return {};
};
