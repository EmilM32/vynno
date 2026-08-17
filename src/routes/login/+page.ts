import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { loggedIn } = await parent();
	if (loggedIn) {
		redirect(307, '/dashboard');
	}
};
