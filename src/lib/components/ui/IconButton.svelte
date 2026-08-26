<script lang="ts" module>
	export type IconButtonVariant = 'ghost' | 'bordered';
	export type IconButtonSize = 'sm' | 'md';

	const VARIANT: Record<IconButtonVariant, string> = {
		ghost: 'hover:bg-surface-container hover:text-primary',
		bordered: 'border border-outline-variant hover:border-outline hover:bg-surface-variant'
	};

	/**
	 * Resting ink. Kept out of `VARIANT` so `selected` can swap it by replacement rather
	 * than by override — two competing `text-*` utilities would be resolved by stylesheet
	 * order, not by the order they appear in the class attribute.
	 */
	const INK: Record<IconButtonVariant, string> = {
		ghost: 'text-on-surface-variant',
		bordered: 'text-on-surface'
	};

	/** `sm` is the WCAG 2.2 2.5.8 floor (24px); `md` meets the 40px mobile target. */
	const SIZE: Record<IconButtonSize, { box: string; icon: IconSize }> = {
		sm: { box: 'min-h-6 min-w-6 p-1', icon: 'sm' },
		md: { box: 'min-h-10 min-w-10 p-2', icon: 'xl' }
	};
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon, { type IconSize } from './Icon.svelte';

	interface Props extends Omit<HTMLButtonAttributes, 'class'> {
		/** Material Symbols Outlined ligature name. */
		icon: string;
		/** Required — becomes the accessible name. Icon-only controls have no visible label. */
		label: string;
		variant?: IconButtonVariant;
		size?: IconButtonSize;
		fill?: boolean;
		/** Active state — swaps the resting ink to `primary`. */
		selected?: boolean;
		/** Renders an `<a>` instead of a `<button>`. */
		href?: string;
		/** Layout utilities ONLY — see Button.svelte. */
		class?: string;
	}

	let {
		icon,
		label,
		variant = 'ghost',
		size = 'md',
		fill = false,
		selected = false,
		href,
		class: className = '',
		disabled = false,
		type,
		...rest
	}: Props = $props();

	const inkClass = $derived(selected ? 'text-primary' : INK[variant]);
</script>

<!--
	No `.press` here by design: docs/motion.md excludes icon-only row and table actions.
	Feedback comes from the colour hover plus the global focus ring.
-->
<svelte:element
	this={href ? 'a' : 'button'}
	{...rest}
	{href}
	type={href ? undefined : (type ?? 'button')}
	disabled={href ? undefined : disabled}
	aria-disabled={href && disabled ? 'true' : undefined}
	aria-label={label}
	class={[
		'focus-ring inline-flex items-center justify-center rounded transition-colors',
		'disabled:cursor-not-allowed disabled:opacity-60',
		'aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
		VARIANT[variant],
		inkClass,
		SIZE[size].box,
		className
	]}
>
	<Icon name={icon} size={SIZE[size].icon} {fill} />
</svelte:element>
