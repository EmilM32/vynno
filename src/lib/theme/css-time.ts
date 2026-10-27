/**
 * A CSS `<time>` (`150ms`, `.15s`) in milliseconds, or `null` if it is not one.
 * Minifiers rewrite `150ms` to `.15s`, so a bare `parseFloat` is off by 1000×.
 */
export function cssTimeToMs(value: string): number | null {
	const match = /^\s*(-?(?:\d+\.?\d*|\.\d+))(ms|s)\s*$/i.exec(value);
	if (!match) return null;
	const n = Number(match[1]);
	return match[2].toLowerCase() === 's' ? n * 1000 : n;
}
