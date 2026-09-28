import { m } from '$lib/paraglide/messages.js';

/** one / few (2–4, excluding 12–14) / other — covers Polish and English. */
export function sessionCountWord(n: number): string {
	const abs = Math.abs(n);
	if (abs === 1) return m.projects_session_one();
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return m.projects_session_few();
	}
	return m.projects_session_other();
}

/** `91 sessions`, or `null` while the count is not loaded (never a fake `0`). */
export function formatSessionCount(count: number | undefined): string | null {
	if (count == null) return null;
	return `${count} ${sessionCountWord(count)}`;
}
