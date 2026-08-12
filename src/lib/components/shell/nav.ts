export type NavItem = {
	href: string;
	label: string;
	/** Material Symbols Outlined ligature name */
	icon: string;
};

/** Primary app destinations — order matches Stitch mockups. */
export const NAV_ITEMS: NavItem[] = [
	{ href: '/timer', label: 'Timer', icon: 'timer' },
	{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
	{ href: '/logs', label: 'Logs', icon: 'list_alt' },
	{ href: '/insights', label: 'Insights', icon: 'analytics' },
	{ href: '/settings', label: 'Settings', icon: 'settings' }
];

export const APP_NAME = 'DevTime';
export const APP_VERSION = 'v0.1.0-dev';

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/dashboard') {
		return pathname === '/dashboard' || pathname === '/';
	}
	return pathname === href || pathname.startsWith(`${href}/`);
}
