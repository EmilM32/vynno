import { localStore } from './local-storage';

/**
 * Forgotten-timer guard. After `hours` of one live session the shell asks whether
 * it is still running on purpose. Device-local like the theme; `null` turns it off.
 */
export const LONG_SESSION_STORAGE_KEY = 'vynno-long-session';
/** The live session the user said to keep going; the notice stays away for it. */
export const LONG_SESSION_DISMISSED_KEY = 'vynno-long-session-dismissed';

export const LONG_SESSION_HOURS = [2, 3, 4, 6, 8] as const;
export const DEFAULT_LONG_SESSION_HOURS = 4;

function parseHours(raw: string | null | undefined): number | null {
	if (raw == null) return DEFAULT_LONG_SESSION_HOURS;
	if (raw === 'off') return null;
	const hours = Number(raw);
	return (LONG_SESSION_HOURS as readonly number[]).includes(hours)
		? hours
		: DEFAULT_LONG_SESSION_HOURS;
}

class LongSessionPrefs {
	hours = $state<number | null>(DEFAULT_LONG_SESSION_HOURS);
	dismissedId = $state<string | null>(null);

	thresholdMs = $derived(this.hours == null ? null : this.hours * 3_600_000);

	/** Read storage. Call on the client after mount. */
	load = (): void => {
		const store = localStore();
		this.hours = parseHours(store?.getItem(LONG_SESSION_STORAGE_KEY));
		this.dismissedId = store?.getItem(LONG_SESSION_DISMISSED_KEY) ?? null;
	};

	setHours = (hours: number | null): void => {
		this.hours = hours;
		localStore()?.setItem(LONG_SESSION_STORAGE_KEY, hours == null ? 'off' : String(hours));
	};

	dismiss = (sessionId: string): void => {
		this.dismissedId = sessionId;
		localStore()?.setItem(LONG_SESSION_DISMISSED_KEY, sessionId);
	};
}

export const longSessionPrefs = new LongSessionPrefs();

/** First guess for "Stop at…": when the reminder threshold passed, never after now. */
export function defaultStopAtMs(startedAtMs: number, thresholdMs: number, nowMs: number): number {
	return Math.min(startedAtMs + thresholdMs, nowMs);
}
