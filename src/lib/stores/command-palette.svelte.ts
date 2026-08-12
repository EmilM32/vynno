/** Shared open state for CMD+K so shell chrome can open the palette. */
class CommandPaletteStore {
	open = $state(false);

	show = (): void => {
		this.open = true;
	};

	hide = (): void => {
		this.open = false;
	};

	toggle = (): void => {
		this.open = !this.open;
	};
}

export const commandPalette = new CommandPaletteStore();
