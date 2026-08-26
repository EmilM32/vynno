<script lang="ts" module>
	export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

	/** The only place Material Symbols sizes are defined. Do not pass `text-[Npx]` via `class`. */
	const SIZE: Record<IconSize, string> = {
		xs: 'text-[14px]',
		sm: 'text-[16px]',
		md: 'text-[18px]',
		lg: 'text-[20px]',
		xl: 'text-[22px]',
		'2xl': 'text-[24px]'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class'> {
		/** Material Symbols Outlined ligature name, e.g. `play_arrow`. */
		name: string;
		size?: IconSize;
		/** Filled variation — used for active nav items and transport glyphs. */
		fill?: boolean;
		/** Colour and layout utilities only. Size comes from `size`. */
		class?: string;
		/** Set false when the icon carries its own accessible name (a status indicator). */
		hidden?: boolean;
	}

	let {
		name,
		size = 'md',
		fill = false,
		class: className = '',
		hidden = true,
		...rest
	}: Props = $props();
</script>

<span
	{...rest}
	class={['material-symbols-outlined', SIZE[size], className]}
	style={fill ? "font-variation-settings: 'FILL' 1" : undefined}
	aria-hidden={hidden ? 'true' : undefined}>{name}</span
>
