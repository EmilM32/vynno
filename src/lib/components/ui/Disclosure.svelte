<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/**
	 * A heading that shows and hides the content under it (APG disclosure).
	 * The panel stays mounted while closed, so half-typed form state survives a toggle,
	 * and `hidden` keeps it out of the tab order and the accessibility tree.
	 */
	interface Props {
		/** Heading text; also the toggle's accessible name. */
		title: string;
		level?: 2 | 3;
		/** Closed by default. Bind it to open the panel from outside, e.g. to show a result. */
		open?: boolean;
		/** Layout utilities only, on the root. */
		class?: string;
		children: Snippet;
	}

	let {
		title,
		level = 2,
		open = $bindable(false),
		class: className = '',
		children
	}: Props = $props();

	const id = $props.id();
	const triggerId = `${id}-trigger`;
	const panelId = `${id}-panel`;
</script>

<div class={className}>
	<svelte:element this={`h${level}`} class="text-headline-md text-on-surface">
		<!-- A heading row, not chrome: no `.press`, and the text lines up with other card titles. -->
		<button
			type="button"
			id={triggerId}
			class="group focus-ring flex min-h-10 w-full items-center justify-between gap-2 rounded text-left"
			aria-expanded={open}
			aria-controls={panelId}
			onclick={() => (open = !open)}
		>
			<span>{title}</span>
			<span
				class={[
					'chevron flex shrink-0 text-on-surface-variant group-hover:text-primary',
					open && 'open'
				]}
			>
				<Icon name="expand_more" size="2xl" />
			</span>
		</button>
	</svelte:element>
	<div id={panelId} role="region" aria-labelledby={triggerId} class="mt-4" hidden={!open}>
		{@render children()}
	</div>
</div>

<style>
	.chevron {
		transition:
			color 150ms ease,
			transform var(--duration-ui) var(--ease-in-out);
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.chevron {
			transition: color 150ms ease;
		}
	}
</style>
