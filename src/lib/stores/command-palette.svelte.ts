/** Shared open state for CMD+K so shell chrome can open the palette. */
class CommandPaletteStore {
	open = $state(false);
	#restore: HTMLElement | null = null;

	show = (restore?: HTMLElement | null): void => {
		if (!this.open) {
			this.#restore =
				restore ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
		}
		this.open = true;
	};

	hide = (): void => {
		this.open = false;
	};

	/** Call after the dialog unmounts and `inert` is cleared. */
	restoreFocus = (): void => {
		const target = this.#restore;
		this.#restore = null;
		// After `inert` is removed (same turn as dialog unmount).
		requestAnimationFrame(() => target?.focus());
	};

	toggle = (): void => {
		if (this.open) this.hide();
		else this.show();
	};
}

export const commandPalette = new CommandPaletteStore();
