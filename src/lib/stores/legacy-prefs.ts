import type { UpdatePrefsInput, UserPrefs } from '$lib/types/domain';
import { clampDailyTargetHours } from './prefs.svelte';

/**
 * Before account prefs, the daily target and default project lived in this device
 * cookie. It is read once to copy them to the account, then deleted. Nothing writes it.
 */
export const LEGACY_PREFS_COOKIE = 'vynno_prefs';

type LegacyPayload = { email: string; defaultProjectId: string; dailyTargetHours: number };

function isPayload(value: unknown): value is LegacyPayload {
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

/**
 * The PATCH that copies the old cookie to the account, or `null`. Only for an account
 * with no prefs yet, so a device's leftover cookie never overwrites prefs saved on
 * another device. A cookie written under another email is ignored, and so is a default
 * project that no longer exists (the PATCH would be a 404 on every load).
 */
export function legacyPrefsPatch(
	raw: string | null | undefined,
	account: { email: string; prefs: UserPrefs | undefined; projectIds: readonly string[] }
): UpdatePrefsInput | null {
	const { email, prefs: saved, projectIds } = account;
	if (!raw || !email) return null;
	if (saved?.dailyTargetMs != null || saved?.defaultProjectId != null) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!isPayload(parsed) || parsed.email !== email) return null;
	const patch: UpdatePrefsInput = {
		dailyTargetMs: Math.round(clampDailyTargetHours(parsed.dailyTargetHours) * 3_600_000)
	};
	if (projectIds.includes(parsed.defaultProjectId))
		patch.defaultProjectId = parsed.defaultProjectId;
	return patch;
}

export function clearLegacyPrefsCookie(): void {
	if (typeof document === 'undefined') return;
	document.cookie = `${LEGACY_PREFS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
