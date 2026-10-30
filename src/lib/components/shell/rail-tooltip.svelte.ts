/**
 * One tooltip for the collapsed sidebar rail (ADR-0029). Rendered `fixed` beside the
 * rail so the scrolling nav list cannot clip it. The first one waits; while another
 * opened less than 300ms ago it is "warm" and the next opens at once.
 */
const OPEN_DELAY_MS = 400;
const WARM_MS = 300;
const GAP_PX = 8;

export class RailTooltip {
	text = $state('');
	x = $state(0);
	y = $state(0);
	open = $state(false);
	#openTimer: ReturnType<typeof setTimeout> | undefined;
	#coolTimer: ReturnType<typeof setTimeout> | undefined;
	#warm = false;

	show(node: HTMLElement, text: string, immediate = false, anchor: HTMLElement = node) {
		clearTimeout(this.#openTimer);
		clearTimeout(this.#coolTimer);
		const place = () => {
			const r = anchor.getBoundingClientRect();
			const rail = node.closest('nav')?.getBoundingClientRect().right ?? r.right;
			this.text = text;
			// Clear of the anchor when it overhangs the rail (the border toggle's handle).
			this.x = Math.max(rail, r.right) + GAP_PX;
			this.y = r.top + r.height / 2;
			this.open = true;
			this.#warm = true;
		};
		if (immediate || this.#warm) place();
		else this.#openTimer = setTimeout(place, OPEN_DELAY_MS);
	}

	hide() {
		clearTimeout(this.#openTimer);
		clearTimeout(this.#coolTimer);
		this.open = false;
		this.#coolTimer = setTimeout(() => (this.#warm = false), WARM_MS);
	}

	/**
	 * Attachment: `{@attach tooltip.for(() => label)}`. Works on a control or a wrapper.
	 * `anchor` positions the tip on a part of the node (a tall hit strip's visible handle).
	 */
	for(text: () => string, anchor: (node: HTMLElement) => HTMLElement = (node) => node) {
		return (node: HTMLElement) => {
			const enter = () => this.show(node, text(), false, anchor(node));
			const focus = (e: FocusEvent) => {
				if ((e.target as HTMLElement).matches(':focus-visible'))
					this.show(node, text(), true, anchor(node));
			};
			const leave = () => this.hide();
			node.addEventListener('pointerenter', enter);
			node.addEventListener('pointerleave', leave);
			node.addEventListener('focusin', focus);
			node.addEventListener('focusout', leave);
			node.addEventListener('click', leave);
			return () => {
				node.removeEventListener('pointerenter', enter);
				node.removeEventListener('pointerleave', leave);
				node.removeEventListener('focusin', focus);
				node.removeEventListener('focusout', leave);
				node.removeEventListener('click', leave);
				// Teardown runs mid-update; writing state synchronously would be an unsafe mutation.
				queueMicrotask(leave);
			};
		};
	}
}
