import { describe, expect, it } from 'vitest';
import { isNavActive, NAV_ITEMS } from './nav';

describe('isNavActive', () => {
	it('treats / and /dashboard as dashboard', () => {
		expect(isNavActive('/', '/dashboard')).toBe(true);
		expect(isNavActive('/dashboard', '/dashboard')).toBe(true);
	});

	it('matches exact path', () => {
		expect(isNavActive('/timer', '/timer')).toBe(true);
		expect(isNavActive('/logs', '/timer')).toBe(false);
	});

	it('matches nested paths under href', () => {
		expect(isNavActive('/settings/profile', '/settings')).toBe(true);
		expect(isNavActive('/insights/week', '/insights')).toBe(true);
	});

	it('does not false-positive across sibling routes', () => {
		expect(isNavActive('/timer', '/dashboard')).toBe(false);
		expect(isNavActive('/logs', '/insights')).toBe(false);
		// "/time" must not match "/timer"
		expect(isNavActive('/time', '/timer')).toBe(false);
	});
});

describe('NAV_ITEMS', () => {
	it('lists primary destinations in order', () => {
		expect(NAV_ITEMS.map((n) => n.href)).toEqual([
			'/timer',
			'/dashboard',
			'/logs',
			'/insights',
			'/projects',
			'/settings'
		]);
	});
});
