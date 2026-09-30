/** Case- and accent-insensitive search key: "Żółw" and "zolw" compare equal. */
export function foldForSearch(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/ł/g, 'l');
}

function isWordStart(text: string, i: number): boolean {
	return i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1]!);
}

/**
 * One folded token against folded text. A substring wins outright; otherwise the
 * token must be a subsequence whose first hit starts a word ("gtl" → "go to logs").
 */
function scoreToken(token: string, text: string): number | null {
	const at = text.indexOf(token);
	if (at !== -1) {
		return 100 + (isWordStart(text, at) ? 20 : 0) - Math.min(at, 20);
	}
	let score = 0;
	let ti = 0;
	let prev = -2;
	for (let i = 0; i < text.length && ti < token.length; i++) {
		if (text[i] !== token[ti]) continue;
		const wordStart = isWordStart(text, i);
		if (ti === 0 && !wordStart) continue;
		score += 1 + (i === prev + 1 ? 3 : 0) + (wordStart ? 2 : 0);
		prev = i;
		ti += 1;
	}
	return ti === token.length ? score : null;
}

/**
 * Match score for a palette query, or `null` when `text` does not match.
 * Every whitespace-separated token must match; higher is better.
 */
export function fuzzyScore(query: string, text: string): number | null {
	const tokens = foldForSearch(query).split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return 0;
	const haystack = foldForSearch(text);
	let total = 0;
	for (const token of tokens) {
		const s = scoreToken(token, haystack);
		if (s == null) return null;
		total += s;
	}
	return total;
}
