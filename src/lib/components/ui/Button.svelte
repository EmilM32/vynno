<script lang="ts" module>
	export type ButtonVariant =
		/** Solid primary fill — the one main action on a screen. */
		| 'primary'
		/** Solid neutral fill — pairs with `primary` in the timer transport. */
		| 'neutral'
		/** Bordered, no fill — row actions, form cancels. The workhorse. */
		| 'secondary'
		/** Primary-tinted, bordered — an accented action that is not the main one. */
		| 'tonal'
		/** Bordered error — destructive row actions. */
		| 'danger'
		/** Solid error — destructive confirmation inside a dialog. */
		| 'danger-filled'
		/** Borderless chrome with a hover tint — quiet actions that still read as buttons. */
		| 'quiet'
		/** Inline underlined text, inherits the surrounding ink — "dismiss" inside a banner. */
		| 'inline'
		/** Inline underlined text in primary — a text CTA in running copy. */
		| 'link'
		/** Segment in a tab strip or segmented control. */
		| 'tab';

	export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

	/**
	 * Which variants carry `.press`. Chrome presses; tabs and inline text links do not
	 * (docs/motion.md — "Do not put `.press` on nav rows, list rows, or icon-only table actions").
	 * This map is the single place that decision lives.
	 */
	const PRESS: Record<ButtonVariant, boolean> = {
		primary: true,
		neutral: true,
		secondary: true,
		tonal: true,
		danger: true,
		'danger-filled': true,
		quiet: true,
		inline: false,
		link: false,
		tab: false
	};

	const VARIANT: Record<ButtonVariant, string> = {
		primary: 'bg-primary text-on-primary hover:bg-primary-container',
		neutral:
			'border border-outline-variant bg-surface-container-highest text-on-surface hover:bg-surface-variant',
		secondary:
			'border border-outline-variant text-on-surface hover:border-outline hover:bg-surface-variant',
		tonal: 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
		danger: 'border border-error/40 text-error hover:bg-error-container/20',
		'danger-filled': 'bg-error-container text-on-error-container hover:opacity-90',
		// Inherits the caller's ink so it can sit on any surface.
		quiet: 'hover:bg-surface-container-high',
		// Also inherits ink on purpose — used inside error banners, where `text-primary`
		// would fight the banner's own colour.
		inline: 'underline underline-offset-2 hover:opacity-80',
		link: 'text-primary underline underline-offset-2 hover:text-primary-container',
		// `tab` is stateful — resolved from `selected` below.
		tab: ''
	};

	/** Type scale per size — applies to every variant. */
	const TEXT: Record<ButtonSize, string> = {
		xs: 'text-body-sm',
		sm: 'text-body-sm',
		md: 'text-body-md',
		lg: 'text-headline-md'
	};

	/** Box metrics per size — skipped for inline text variants, which sit in a sentence. */
	const BOX: Record<ButtonSize, string> = {
		xs: 'min-h-6 px-2 py-1',
		sm: 'min-h-8 px-2.5 py-1.5',
		md: 'min-h-10 px-4 py-2',
		lg: 'min-h-10 px-4 py-2'
	};

	const INLINE = new Set<ButtonVariant>(['inline', 'link']);
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLButtonAttributes, 'class'> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		/** Renders an `<a>` instead of a `<button>`. `disabled` then becomes `aria-disabled`. */
		href?: string;
		/**
		 * `variant="tab"` only — drives the active styling. ARIA stays with the caller:
		 * pass `aria-pressed` or `role="tab" aria-selected` yourself.
		 */
		selected?: boolean;
		/**
		 * Content alignment. A prop rather than a `class` override because
		 * `justify-*` utilities collide with the base and Tailwind resolves that
		 * by stylesheet order, not by class-attribute order.
		 */
		justify?: 'center' | 'start' | 'between';
		/**
		 * Layout utilities ONLY — flex, width, margin, order, responsive visibility.
		 * Never padding, radius, border or type scale: those come from `variant` and
		 * `size`, and `primitives.guard.test.ts` fails the build otherwise.
		 *
		 * Colour is allowed, but only meaningfully on `quiet` and `inline`, which set no
		 * ink of their own. On a variant that does set ink, two competing `text-*`
		 * utilities are resolved by stylesheet order rather than by the order here —
		 * so recolour via the variant, not via this prop.
		 */
		class?: string;
		children: Snippet;
	}

	const JUSTIFY = {
		center: 'justify-center',
		start: 'justify-start',
		between: 'justify-between'
	} as const;

	let {
		variant = 'secondary',
		size = 'md',
		href,
		selected = false,
		justify = 'center',
		class: className = '',
		children,
		disabled = false,
		type,
		...rest
	}: Props = $props();

	const tabClass = $derived(
		selected
			? 'bg-surface-container-high text-primary'
			: 'text-on-surface-variant hover:text-on-surface'
	);
	const variantClass = $derived(variant === 'tab' ? tabClass : VARIANT[variant]);
	const pressClass = $derived(PRESS[variant] ? 'press' : 'transition-colors');
	const sizeClass = $derived(INLINE.has(variant) ? TEXT[size] : `${BOX[size]} ${TEXT[size]}`);
</script>

<svelte:element
	this={href ? 'a' : 'button'}
	{...rest}
	{href}
	type={href ? undefined : (type ?? 'button')}
	disabled={href ? undefined : disabled}
	aria-disabled={href && disabled ? 'true' : undefined}
	class={[
		'focus-ring inline-flex items-center gap-2 rounded',
		'disabled:cursor-not-allowed disabled:opacity-60',
		'aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
		JUSTIFY[justify],
		pressClass,
		variantClass,
		sizeClass,
		className
	]}
>
	{@render children()}
</svelte:element>
