/**
 * Desktop sidebar width, per device (ADR-0029). A cookie rather than `localStorage`:
 * the rail renders different markup, so SSR has to know before first paint.
 */
export const SIDEBAR_COOKIE = 'vynno_sidebar';

const RAIL = 'rail';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isRailCookie(raw: string | null | undefined): boolean {
	return raw === RAIL;
}

export function writeSidebarCookie(collapsed: boolean): void {
	document.cookie = collapsed
		? `${SIDEBAR_COOKIE}=${RAIL}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`
		: `${SIDEBAR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** ⌘B / Ctrl+B. Shift and Alt combinations are left to the browser. */
export function isSidebarToggleKey(
	e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>
): boolean {
	return (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b';
}
