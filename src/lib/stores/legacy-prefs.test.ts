import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLegacyPrefsCookie, LEGACY_PREFS_COOKIE, legacyPrefsPatch } from './legacy-prefs';

const email = 'alexdev@vynno.local';
const cookie = (payload: object) => JSON.stringify({ email, ...payload });
const account = (prefs: object | undefined = {}, projectIds = ['proj-a', 'proj-b']) => ({
	email,
	prefs,
	projectIds
});

describe('legacyPrefsPatch', () => {
	it('copies an old cookie to an account with no prefs', () => {
		expect(
			legacyPrefsPatch(cookie({ defaultProjectId: 'proj-b', dailyTargetHours: 6 }), account())
		).toEqual({
			dailyTargetMs: 6 * 3_600_000,
			defaultProjectId: 'proj-b'
		});
	});

	it('clamps the hours and skips an empty or deleted default project', () => {
		for (const defaultProjectId of ['', 'proj-gone']) {
			expect(
				legacyPrefsPatch(cookie({ defaultProjectId, dailyTargetHours: 40 }), account(undefined))
			).toEqual({ dailyTargetMs: 16 * 3_600_000 });
		}
	});

	it('never overwrites prefs the account already has', () => {
		const raw = cookie({ defaultProjectId: 'proj-b', dailyTargetHours: 6 });
		expect(legacyPrefsPatch(raw, account({ dailyTargetMs: 3_600_000 }))).toBeNull();
		expect(legacyPrefsPatch(raw, account({ defaultProjectId: 'proj-a' }))).toBeNull();
	});

	it('ignores another account, garbage, and no cookie', () => {
		const raw = cookie({ defaultProjectId: 'proj-b', dailyTargetHours: 6 });
		expect(legacyPrefsPatch(raw, { ...account(), email: 'someone@else.dev' })).toBeNull();
		expect(legacyPrefsPatch('{not json', account())).toBeNull();
		expect(legacyPrefsPatch(JSON.stringify({ email }), account())).toBeNull();
		expect(legacyPrefsPatch(undefined, account())).toBeNull();
	});
});

describe('clearLegacyPrefsCookie', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('expires the cookie', () => {
		const doc = { cookie: '' };
		vi.stubGlobal('document', doc);
		clearLegacyPrefsCookie();
		expect(doc.cookie).toBe(`${LEGACY_PREFS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
	});
});
