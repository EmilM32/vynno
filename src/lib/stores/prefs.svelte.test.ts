import { describe, expect, it } from 'vitest';
import { clampDailyTargetHours, PrefsStore } from './prefs.svelte';

describe('PrefsStore', () => {
	it('applies the account prefs from the seed', () => {
		const prefs = new PrefsStore();
		prefs.applyPrefs({ defaultProjectId: 'proj-b', dailyTargetMs: 6 * 3_600_000 });
		expect(prefs.defaultProjectId).toBe('proj-b');
		expect(prefs.dailyTargetHours).toBe(6);
		expect(prefs.snapshot()).toEqual({ defaultProjectId: 'proj-b', dailyTargetMs: 6 * 3_600_000 });
	});

	it('uses 8 hours and no default project when the account has none', () => {
		const prefs = new PrefsStore();
		prefs.applyPrefs(undefined);
		expect(prefs.defaultProjectId).toBe('');
		expect(prefs.dailyTargetMs).toBe(8 * 3_600_000);
		expect(prefs.snapshot()).toEqual({});
	});

	it('applies a patch: omitted fields stay, null clears', () => {
		const prefs = new PrefsStore();
		prefs.applyPrefs({ defaultProjectId: 'proj-b', dailyTargetMs: 6 * 3_600_000 });
		prefs.applyPatch({ dailyTargetMs: null });
		expect(prefs.savedDailyTargetMs).toBeUndefined();
		expect(prefs.dailyTargetHours).toBe(8);
		expect(prefs.defaultProjectId).toBe('proj-b');
		prefs.applyPatch({ defaultProjectId: null, dailyTargetMs: 3_600_000 });
		expect(prefs.snapshot()).toEqual({ dailyTargetMs: 3_600_000 });
	});

	it('keeps prefs when the profile hydrates again', () => {
		const prefs = new PrefsStore();
		prefs.hydrateProfile({ displayName: 'Alex', email: 'alex@vynno.local' });
		prefs.applyPrefs({ defaultProjectId: 'proj-b' });
		prefs.hydrateProfile({ displayName: 'Alex Dev', email: 'alex.new@vynno.local' });
		expect(prefs.defaultProjectId).toBe('proj-b');
		expect(prefs.email).toBe('alex.new@vynno.local');
	});
});

describe('clampDailyTargetHours', () => {
	it('clamps to the Settings range and rounds to one decimal', () => {
		expect(clampDailyTargetHours(0)).toBe(1);
		expect(clampDailyTargetHours(20)).toBe(16);
		expect(clampDailyTargetHours(6.26)).toBe(6.3);
		expect(clampDailyTargetHours(Number.NaN)).toBe(8);
	});
});
