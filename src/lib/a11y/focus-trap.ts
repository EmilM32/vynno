const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

export function getFocusable(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((el) => {
		if (el.tabIndex < 0) return false;
		if (el.hasAttribute('inert')) return false;
		if (el.getAttribute('aria-hidden') === 'true') return false;
		return el.getClientRects().length > 0;
	});
}

/** Set `inert` on every sibling of `node` and its ancestors up to `document.body`. */
export function setInertOutside(node: HTMLElement, inert: boolean): void {
	let current: HTMLElement | null = node;
	while (current && current !== document.body) {
		const parent: HTMLElement | null = current.parentElement;
		if (!parent) break;
		for (const sibling of parent.children) {
			if (sibling === current || !(sibling instanceof HTMLElement)) continue;
			if (inert) sibling.setAttribute('inert', '');
			else sibling.removeAttribute('inert');
		}
		current = parent;
	}
}

/**
 * Trap Tab inside `container` and restore focus on cleanup.
 * Also inerts the rest of the document so AT cannot reach background content.
 */
export function trapFocus(container: HTMLElement, options: { restore?: boolean } = {}): () => void {
	const restore = options.restore !== false;
	const previouslyFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	setInertOutside(container, true);

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;
		if (!container.contains(document.activeElement)) return;
		const focusable = getFocusable(container);
		if (focusable.length === 0) {
			e.preventDefault();
			container.focus();
			return;
		}
		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	document.addEventListener('keydown', onKeydown, true);

	return () => {
		document.removeEventListener('keydown', onKeydown, true);
		setInertOutside(container, false);
		if (restore) previouslyFocused?.focus();
	};
}
