import { getContext, setContext } from 'svelte';

const KEY = Symbol('vynno-menu');

/** Wired by `Menu` so a nested `MenuItem` closes the menu and hands focus back to the trigger. */
export type MenuContext = {
	select: (fn: () => void) => void;
};

export function setMenuContext(ctx: MenuContext): MenuContext {
	return setContext(KEY, ctx);
}

export function getMenuContext(): MenuContext {
	const ctx = getContext<MenuContext | undefined>(KEY);
	if (!ctx) throw new Error('MenuItem must be rendered inside a Menu');
	return ctx;
}
