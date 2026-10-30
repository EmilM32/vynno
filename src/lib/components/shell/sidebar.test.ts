import { describe, expect, it } from 'vitest';
import { isRailCookie, isSidebarToggleKey } from './sidebar';

const key = (
	key: string,
	mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {}
) => ({
	key,
	metaKey: false,
	ctrlKey: false,
	shiftKey: false,
	altKey: false,
	...mods
});

describe('isRailCookie', () => {
	it('is true only for the rail value', () => {
		expect(isRailCookie('rail')).toBe(true);
		expect(isRailCookie('')).toBe(false);
		expect(isRailCookie('expanded')).toBe(false);
		expect(isRailCookie(undefined)).toBe(false);
	});
});

describe('isSidebarToggleKey', () => {
	it('matches ⌘B and Ctrl+B', () => {
		expect(isSidebarToggleKey(key('b', { metaKey: true }))).toBe(true);
		expect(isSidebarToggleKey(key('B', { ctrlKey: true }))).toBe(true);
	});

	it('ignores a bare B and other modifier combinations', () => {
		expect(isSidebarToggleKey(key('b'))).toBe(false);
		expect(isSidebarToggleKey(key('b', { metaKey: true, shiftKey: true }))).toBe(false);
		expect(isSidebarToggleKey(key('b', { ctrlKey: true, altKey: true }))).toBe(false);
		expect(isSidebarToggleKey(key('k', { metaKey: true }))).toBe(false);
	});
});
