import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clampDailyTargetHours,
	parsePrefsCookie,
	persistPrefsCookie,
	PREFS_COOKIE
} from './prefs-storage';

const email = 'alexdev@vynno.local';

describe('clampDailyTargetHours', () => {
	it('clamps and rounds to one decimal', () => {
		expect(clampDailyTargetHours(0)).toBe(1);
		expect(clampDailyTargetHours(20)).toBe(16);
		expect(clampDailyTargetHours(6.26)).toBe(6.3);
		expect(clampDailyTargetHours(Number.NaN)).toBe(8);
	});
});

describe('parsePrefsCookie', () => {
	it('returns stored prefs when the email matches', () => {
		const raw = JSON.stringify({
			email,
			defaultProjectId: 'proj-b',
			dailyTargetHours: 6
		});
		expect(parsePrefsCookie(raw, email)).toEqual({
			defaultProjectId: 'proj-b',
			dailyTargetHours: 6
		});
	});

	it('returns null for a different account', () => {
		const raw = JSON.stringify({
			email,
			defaultProjectId: 'proj-b',
			dailyTargetHours: 6
		});
		expect(parsePrefsCookie(raw, 'other@vynno.local')).toBeNull();
	});

	it('returns null for garbage, empty, or missing email', () => {
		expect(parsePrefsCookie('not-json', email)).toBeNull();
		expect(parsePrefsCookie('', email)).toBeNull();
		expect(parsePrefsCookie(undefined, email)).toBeNull();
		expect(
			parsePrefsCookie(
				JSON.stringify({ email, defaultProjectId: 'proj-b', dailyTargetHours: 6 }),
				''
			)
		).toBeNull();
	});

	it('clamps an out-of-range daily target', () => {
		const raw = JSON.stringify({
			email,
			defaultProjectId: 'proj-b',
			dailyTargetHours: 99
		});
		expect(parsePrefsCookie(raw, email)?.dailyTargetHours).toBe(16);
	});
});

describe('persistPrefsCookie', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('writes an encoded JSON cookie for the current account', () => {
		const written: string[] = [];
		vi.stubGlobal('document', {
			get cookie() {
				return written.at(-1) ?? '';
			},
			set cookie(value: string) {
				written.push(value);
			}
		});

		persistPrefsCookie(email, { defaultProjectId: 'proj-b', dailyTargetHours: 6 });

		expect(written).toHaveLength(1);
		const [cookie] = written;
		expect(cookie.startsWith(`${PREFS_COOKIE}=`)).toBe(true);
		expect(cookie).toContain('Path=/');
		expect(cookie).toContain('SameSite=Lax');

		const value = decodeURIComponent(cookie.slice(PREFS_COOKIE.length + 1).split(';')[0]);
		expect(JSON.parse(value)).toEqual({
			email,
			defaultProjectId: 'proj-b',
			dailyTargetHours: 6
		});
	});

	it('no-ops without an email', () => {
		const written: string[] = [];
		vi.stubGlobal('document', {
			set cookie(value: string) {
				written.push(value);
			}
		});
		persistPrefsCookie('', { defaultProjectId: 'proj-b', dailyTargetHours: 6 });
		expect(written).toEqual([]);
	});
});
