import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_LONG_SESSION_HOURS,
	defaultStopAtMs,
	LONG_SESSION_DISMISSED_KEY,
	LONG_SESSION_STORAGE_KEY,
	longSessionPrefs
} from './long-session.svelte';

function memoryStorage(seed: Record<string, string> = {}): Storage {
	const data = new Map(Object.entries(seed));
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => data.get(k) ?? null,
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, String(v))
	};
}

describe('longSessionPrefs', () => {
	let storage: Storage;

	beforeEach(() => {
		storage = memoryStorage();
		vi.stubGlobal('localStorage', storage);
	});

	afterEach(() => {
		// Reset while the stub is still in place: Node's own localStorage warns when touched.
		longSessionPrefs.setHours(DEFAULT_LONG_SESSION_HOURS);
		longSessionPrefs.dismissedId = null;
		vi.unstubAllGlobals();
	});

	it('defaults to four hours with nothing stored', () => {
		longSessionPrefs.load();
		expect(longSessionPrefs.hours).toBe(4);
		expect(longSessionPrefs.thresholdMs).toBe(4 * 3_600_000);
	});

	it('reads off, a listed choice, and falls back on anything else', () => {
		storage.setItem(LONG_SESSION_STORAGE_KEY, 'off');
		longSessionPrefs.load();
		expect(longSessionPrefs.thresholdMs).toBeNull();

		storage.setItem(LONG_SESSION_STORAGE_KEY, '8');
		longSessionPrefs.load();
		expect(longSessionPrefs.hours).toBe(8);

		storage.setItem(LONG_SESSION_STORAGE_KEY, '5');
		longSessionPrefs.load();
		expect(longSessionPrefs.hours).toBe(DEFAULT_LONG_SESSION_HOURS);
	});

	it('persists the choice and the dismissed session', () => {
		longSessionPrefs.setHours(null);
		longSessionPrefs.dismiss('sess-1');
		expect(storage.getItem(LONG_SESSION_STORAGE_KEY)).toBe('off');
		expect(storage.getItem(LONG_SESSION_DISMISSED_KEY)).toBe('sess-1');
	});
});

describe('defaultStopAtMs', () => {
	it('guesses the moment the threshold passed', () => {
		expect(defaultStopAtMs(1_000, 4_000, 10_000)).toBe(5_000);
	});

	it('never guesses a time after now', () => {
		expect(defaultStopAtMs(1_000, 4_000, 3_000)).toBe(3_000);
	});
});
