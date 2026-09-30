/**
 * `localStorage`, or `null` on the server and where the browser refuses access
 * (private mode, blocked site data). Callers treat `null` as "use the default".
 */
export function localStore(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}
