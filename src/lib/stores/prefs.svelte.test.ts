import { describe, expect, it } from 'vitest';
import { PrefsStore } from './prefs.svelte';

describe('PrefsStore', () => {
	it('restores stored prefs after profile hydrate', () => {
		const prefs = new PrefsStore();
		prefs.hydrateProfile({ displayName: 'Alex', email: 'alexdev@vynno.local' });
		prefs.applyStored({ defaultProjectId: 'proj-b', dailyTargetHours: 6 });
		expect(prefs.defaultProjectId).toBe('proj-b');
		expect(prefs.dailyTargetHours).toBe(6);
	});

	it('ignores a missing snapshot', () => {
		const prefs = new PrefsStore();
		prefs.hydrateProfile({ displayName: 'Alex', email: 'alexdev@vynno.local' });
		prefs.applyStored(null);
		expect(prefs.defaultProjectId).toBe('');
		expect(prefs.dailyTargetHours).toBe(8);
	});

	it('resets device prefs when the signed-in email changes', () => {
		const prefs = new PrefsStore();
		prefs.hydrateProfile({ displayName: 'Alex', email: 'alex@vynno.local' });
		prefs.setDefaultProjectId('proj-b');
		prefs.setDailyTargetHours(5);
		prefs.hydrateProfile({ displayName: 'Bea', email: 'bea@vynno.local' });
		expect(prefs.defaultProjectId).toBe('');
		expect(prefs.dailyTargetHours).toBe(8);
	});

	it('keeps device prefs when the same profile hydrates again', () => {
		const prefs = new PrefsStore();
		prefs.hydrateProfile({ displayName: 'Alex', email: 'alex@vynno.local' });
		prefs.setDefaultProjectId('proj-b');
		prefs.hydrateProfile({ displayName: 'Alex Dev', email: 'alex@vynno.local' });
		expect(prefs.defaultProjectId).toBe('proj-b');
		expect(prefs.displayName).toBe('Alex Dev');
	});
});
