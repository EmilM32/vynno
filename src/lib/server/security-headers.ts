/**
 * Static hardening headers for every response the app serves (ADR-0025).
 *
 * The Content-Security-Policy is **not** here — it is generated per render by `kit.csp` in
 * `svelte.config.js`, which owns the nonce. This module carries only the constant headers.
 *
 * Deliberately absent: `Strict-Transport-Security`. The daily origin is
 * `https://vynno.localhost`, and HSTS there pins every `*.localhost` origin to HTTPS in the
 * browser for the max-age, breaking unrelated local projects.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	// Legacy backstop; `frame-ancestors 'none'` in the CSP is the real control.
	'X-Frame-Options': 'DENY'
});

/**
 * Set the hardening headers on `response`.
 *
 * Some responses (notably those returned straight from an endpoint) carry immutable headers, so
 * fall back to rebuilding the response — the same idiom `handleRequestId` uses in `hooks.server.ts`.
 */
export function applySecurityHeaders(response: Response): Response {
	try {
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			response.headers.set(name, value);
		}
		return response;
	} catch {
		const headers = new Headers(response.headers);
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			headers.set(name, value);
		}
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	}
}
