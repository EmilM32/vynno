/** Device prefs that affect first paint. Server reads this cookie (like `vynno_tz`). */
export const PREFS_COOKIE = 'vynno_prefs';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type StoredPrefs = {
	defaultProjectId: string;
	dailyTargetHours: number;
};

type CookiePayload = StoredPrefs & { email: string };

export function clampDailyTargetHours(hours: number): number {
	const n = Number.isFinite(hours) ? hours : 8;
	return Math.min(16, Math.max(1, Math.round(n * 10) / 10));
}

function isPayload(value: unknown): value is CookiePayload {
	if (!value || typeof value !== 'object') return false;
	const o = value as Record<string, unknown>;
	return (
		typeof o.email === 'string' &&
		o.email.length > 0 &&
		typeof o.defaultProjectId === 'string' &&
		typeof o.dailyTargetHours === 'number' &&
		Number.isFinite(o.dailyTargetHours)
	);
}

/** Decode a cookie value. Wrong email / garbage → `null` (caller keeps defaults). */
export function parsePrefsCookie(
	raw: string | null | undefined,
	email: string
): StoredPrefs | null {
	if (!raw || !email) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isPayload(parsed) || parsed.email !== email) return null;
		return {
			defaultProjectId: parsed.defaultProjectId,
			dailyTargetHours: clampDailyTargetHours(parsed.dailyTargetHours)
		};
	} catch {
		return null;
	}
}

export function persistPrefsCookie(email: string, prefs: StoredPrefs): void {
	if (typeof document === 'undefined' || !email) return;
	const payload: CookiePayload = {
		email,
		defaultProjectId: prefs.defaultProjectId,
		dailyTargetHours: prefs.dailyTargetHours
	};
	document.cookie = `${PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}
