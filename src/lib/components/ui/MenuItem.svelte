<script lang="ts" module>
	export type MenuItemTone = 'neutral' | 'danger';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button, { type ButtonVariant } from './Button.svelte';
	import { getMenuContext } from './menu-context';

	/** One action in a `Menu`. Closes the menu, returns focus to the trigger, then runs `onselect`. */
	interface Props {
		onselect: () => void;
		/** `danger` for a destructive action (Delete). */
		tone?: MenuItemTone;
		disabled?: boolean;
		/** Id of an `sr-only` reason, typically why the item is disabled. */
		'aria-describedby'?: string;
		children: Snippet;
	}

	let {
		onselect,
		tone = 'neutral',
		disabled = false,
		'aria-describedby': describedBy,
		children
	}: Props = $props();

	const VARIANT: Record<MenuItemTone, ButtonVariant> = {
		neutral: 'secondary',
		danger: 'danger'
	};

	const menu = getMenuContext();
</script>

<Button
	variant={VARIANT[tone]}
	size="sm"
	class="w-full"
	role="menuitem"
	{disabled}
	aria-describedby={describedBy}
	onclick={() => menu.select(onselect)}
>
	{@render children()}
</Button>
