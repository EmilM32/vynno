/** Code points, not UTF-16 code units. */
export function codePointLength(value: string): number {
	return Array.from(value).length;
}

export const NAME_MAX = 80;
export const NOTE_MAX = 500;
export const TICKET_MAX = 64;

export type TextReject = 'invalid' | 'empty' | 'too_long';

export type NormalizeResult = { ok: true; value: string } | { ok: false; reason: TextReject };

const STRIP = new Set<number>([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);

function isBidi(cp: number): boolean {
	return (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069);
}

/** Unicode Cc: C0, DEL, and C1 (U+0080–U+009F), as the API. Notes may keep tab, LF, and CR. */
function isRejectedControl(cp: number, note: boolean): boolean {
	if (cp > 0x1f && (cp < 0x7f || cp > 0x9f)) return false;
	if (note && (cp === 0x09 || cp === 0x0a || cp === 0x0d)) return false;
	return true;
}

/**
 * Go `unicode.IsSpace` for everything that survives `clean`. `/\s/u` also matches
 * U+FEFF, which Go does not trim (notes keep it; names strip it first). NEL is Cc
 * and rejected before trimming.
 */
function isTrimChar(cp: number): boolean {
	return cp !== 0xfeff && /\s/u.test(String.fromCodePoint(cp));
}

function fromCodePoints(cps: number[]): string {
	let out = '';
	const chunk = 0x8000;
	for (let i = 0; i < cps.length; i += chunk) {
		out += String.fromCodePoint(...cps.slice(i, i + chunk));
	}
	return out;
}

function clean(raw: string, note: boolean): number[] | 'invalid' {
	const nfc = raw.normalize('NFC');
	const cps: number[] = [];
	for (const char of nfc) {
		const cp = char.codePointAt(0)!;
		if (isBidi(cp) || isRejectedControl(cp, note)) return 'invalid';
		// Names and tickets only: notes keep U+FFFD and zero-width characters (ZWJ emoji).
		if (!note && cp === 0xfffd) return 'invalid';
		if (!note && STRIP.has(cp)) continue;
		cps.push(cp);
	}
	let start = 0;
	let end = cps.length;
	while (start < end && isTrimChar(cps[start]!)) start++;
	while (end > start && isTrimChar(cps[end - 1]!)) end--;
	return cps.slice(start, end);
}

/**
 * NFC, strip zero-width / FEFF, trim Unicode spaces, reject bidi, Cc, and U+FFFD.
 * Length is code points. Empty after cleaning fails when `min` is greater than 0.
 */
export function normalizeName(raw: string, bounds: { min: number; max: number }): NormalizeResult {
	const cps = clean(raw, false);
	if (cps === 'invalid') return { ok: false, reason: 'invalid' };
	if (cps.length < bounds.min) return { ok: false, reason: 'empty' };
	if (cps.length > bounds.max) return { ok: false, reason: 'too_long' };
	return { ok: true, value: fromCodePoints(cps) };
}

/**
 * Note: max 500 code points. Empty stays `''` (the API stores it as Untitled).
 * Tab, LF, and CR are allowed. No zero-width strip and no U+FFFD reject, as the API.
 */
export function normalizeNote(raw: string): NormalizeResult {
	const cps = clean(raw, true);
	if (cps === 'invalid') return { ok: false, reason: 'invalid' };
	if (cps.length > NOTE_MAX) return { ok: false, reason: 'too_long' };
	return { ok: true, value: fromCodePoints(cps) };
}

/** Ticket id: empty stays `''`. Same character rules as names. Max 64 code points. */
export function normalizeTicketId(raw: string): NormalizeResult {
	return normalizeName(raw, { min: 0, max: TICKET_MAX });
}
