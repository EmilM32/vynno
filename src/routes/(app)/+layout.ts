import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent }) => {
	const { loggedIn } = await parent();
	if (!loggedIn) {
		redirect(307, '/login');
	}
	return {};
};
