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

/**
 * Set `inert` on siblings of `node` (and ancestor siblings) that are not already inert.
 * Returns those elements so cleanup can run after `node` is detached from the document.
 */
export function setInertOutside(node: HTMLElement): HTMLElement[] {
	const added: HTMLElement[] = [];
	let current: HTMLElement | null = node;
	while (current && current !== document.body) {
		const parent: HTMLElement | null = current.parentElement;
		if (!parent) break;
		for (const sibling of parent.children) {
			if (sibling === current || !(sibling instanceof HTMLElement)) continue;
			if (sibling.hasAttribute('inert')) continue;
			sibling.setAttribute('inert', '');
			added.push(sibling);
		}
		current = parent;
	}
	return added;
}

/**
 * Trap Tab inside `container` and restore focus on cleanup.
 * Also inerts the rest of the document so AT cannot reach background content.
 */
export function trapFocus(container: HTMLElement, options: { restore?: boolean } = {}): () => void {
	const restore = options.restore !== false;
	const previouslyFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	const inerted = setInertOutside(container);

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
		for (const el of inerted) el.removeAttribute('inert');
		if (restore) previouslyFocused?.focus();
	};
}
