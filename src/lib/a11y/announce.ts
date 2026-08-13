type Politeness = 'polite' | 'assertive';

let politeEl: HTMLElement | null = null;
let assertiveEl: HTMLElement | null = null;

/** Bind the visually hidden live regions mounted in the app shell. */
export function bindAnnouncers(polite: HTMLElement, assertive: HTMLElement): void {
	politeEl = polite;
	assertiveEl = assertive;
}

/**
 * Announce a short status message. No-ops when regions are unbound (unit tests).
 * Clears then sets text so the same phrase can be re-announced.
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
	const el = politeness === 'assertive' ? assertiveEl : politeEl;
	if (!el || !message) return;
	el.textContent = '';
	requestAnimationFrame(() => {
		el.textContent = message;
	});
}
