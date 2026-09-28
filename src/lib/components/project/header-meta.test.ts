import { describe, expect, it } from 'vitest';
import { projectHeaderMeta } from './header-meta';

const nowMs = Date.UTC(2026, 8, 28, 12, 0, 0);
const base = { lastLogged: undefined, historyComplete: false, sessionCount: undefined, nowMs };

describe('projectHeaderMeta', () => {
	it('shows last logged when a session of the project is loaded', () => {
		const label = projectHeaderMeta({
			...base,
			lastLogged: new Date(nowMs - 2 * 3_600_000).toISOString()
		});
		expect(label).toMatch(/^Last logged /);
	});

	it('never claims "No sessions yet." for older sessions outside the loaded window', () => {
		expect(projectHeaderMeta(base)).toBe('');
		expect(projectHeaderMeta({ ...base, sessionCount: 91 })).toBe('91 sessions');
	});

	it('says "No sessions yet." only when the count is 0 or history is fully loaded', () => {
		expect(projectHeaderMeta({ ...base, sessionCount: 0 })).toBe('No sessions yet.');
		expect(projectHeaderMeta({ ...base, historyComplete: true })).toBe('No sessions yet.');
	});
});
