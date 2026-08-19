import pkg from '../../../../package.json' with { type: 'json' };
import { m } from '$lib/paraglide/messages.js';

export type AppRoute = '/timer' | '/dashboard' | '/logs' | '/insights' | '/projects' | '/settings';

export type NavItem = {
	href: AppRoute;
	/** Localized label — call at render time. */
	label: () => string;
	icon: string;
};

export const NAV_ITEMS: NavItem[] = [
	{ href: '/timer', label: () => m.nav_timer(), icon: 'timer' },
	{ href: '/dashboard', label: () => m.nav_dashboard(), icon: 'dashboard' },
	{ href: '/logs', label: () => m.nav_logs(), icon: 'list_alt' },
	{ href: '/insights', label: () => m.nav_insights(), icon: 'analytics' },
	{ href: '/projects', label: () => m.nav_projects(), icon: 'folder_managed' },
	{ href: '/settings', label: () => m.nav_settings(), icon: 'settings' }
];

export const APP_VERSION = `v${pkg.version}`;

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/dashboard') {
		return pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard/');
	}
	return pathname === href || pathname.startsWith(`${href}/`);
}
