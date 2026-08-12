export type AppRoute =
	| '/timer'
	| '/dashboard'
	| '/logs'
	| '/insights'
	| '/projects'
	| '/settings';

export type NavItem = {
	href: AppRoute;
	label: string;
	icon: string;
};

export const NAV_ITEMS: NavItem[] = [
	{ href: '/timer', label: 'Timer', icon: 'timer' },
	{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
	{ href: '/logs', label: 'Logs', icon: 'list_alt' },
	{ href: '/insights', label: 'Insights', icon: 'analytics' },
	{ href: '/projects', label: 'Projects', icon: 'folder_managed' },
	{ href: '/settings', label: 'Settings', icon: 'settings' }
];

export const APP_NAME = 'DevTime';
export const APP_VERSION = 'v0.1.0-alpha';

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/dashboard') {
		return pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard/');
	}
	return pathname === href || pathname.startsWith(`${href}/`);
}
