import { getFocusable, trapFocus } from '$lib/a11y/focus-trap';
import { cssTimeToMs } from '$lib/theme/css-time';

export type CloseFn = (then?: () => void) => void;

interface OverlayOptions {
	onclose: () => void;
	initialFocus?: () => HTMLElement | undefined;
	/** Custom property holding the exit duration, read at close so the timer cannot drift from CSS. */
	exitToken: string;
	/** Used if the token cannot be read; keep equal to the token. */
	exitFallbackMs: number;
}

/**
 * Focus trap, initial focus and the delayed close shared by `Dialog` and `Drawer`.
 * The parent stays `open` until the exit has played, then `then` (default `onclose`) runs.
 */
export class Overlay {
	closing = $state(false);

	#options: () => OverlayOptions;
	#node: HTMLElement | undefined;
	#closeTimer: number | undefined;
	#releaseTrap: (() => void) | undefined;

	constructor(options: () => OverlayOptions) {
		this.#options = options;
	}

	/** Hand the page back (inert off, focus restored) before the exit plays, so input is not lost. */
	#release() {
		this.#releaseTrap?.();
		this.#releaseTrap = undefined;
	}

	#exitMs(): number {
		const { exitToken, exitFallbackMs } = this.#options();
		const raw = this.#node ? getComputedStyle(this.#node).getPropertyValue(exitToken) : '';
		return cssTimeToMs(raw) ?? exitFallbackMs;
	}

	close: CloseFn = (then) => {
		if (this.closing) return;
		const done = then ?? this.#options().onclose;
		this.closing = true;
		this.#release();
		this.#closeTimer = window.setTimeout(() => {
			this.#closeTimer = undefined;
			this.closing = false;
			done();
		}, this.#exitMs());
	};

	/** `{@attach}` on the full-screen overlay root. */
	attach = (node: HTMLElement) => {
		this.#node = node;
		this.#releaseTrap = trapFocus(node);
		// On touch, focusing a field opens the keyboard over the form (EMI-275): focus the panel
		// instead, as CommandPalette does. An explicit `initialFocus` still wins.
		const coarse = window.matchMedia('(pointer: coarse)').matches;
		const frame = requestAnimationFrame(() => {
			const panel = node.querySelector<HTMLElement>('[role="dialog"]');
			const target = this.#options().initialFocus?.() ?? (coarse ? panel : getFocusable(node)[0]);
			target?.focus();
		});
		return () => {
			this.#node = undefined;
			cancelAnimationFrame(frame);
			this.#release();
			if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
		};
	};
}
