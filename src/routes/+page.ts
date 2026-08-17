import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { loggedIn } = await parent();
	redirect(307, loggedIn ? '/dashboard' : '/login');
};
