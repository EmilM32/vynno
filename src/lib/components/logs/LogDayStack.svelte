<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { formatStoppedDuration } from '$lib/time/duration';

	/** Cards that peek out behind the top one when the day is stacked (ADR-0035). */
	const DEPTH = 2;
	const OPACITY = [1, 0.8, 0.55];

	/**
	 * One Logs day: the date header and its rows, which collapse into a card stack.
	 * Children are the day's rows in order; a child with `data-stack-skip` (a gap
	 * line) is not a card and fades out instead of stacking.
	 */
	let {
		dateKey,
		today = false,
		first = false,
		cards,
		sessions,
		totalMs,
		children
	}: {
		dateKey: string;
		today?: boolean;
		first?: boolean;
		/** Card count — sessions in Entries, tasks in Grouped. A single card has nothing to stack. */
		cards: number;
		sessions: number;
		totalMs: number;
		children: Snippet;
	} = $props();

	let open = $state(true);
	let moving = $state(false);
	let full = $state(0);
	let topHeight = $state(0);

	const stackable = $derived(cards > 1);
	const stacked = $derived(stackable && !open);
	const depth = $derived(Math.min(cards - 1, DEPTH));
	const stackId = $derived(`log-day-${dateKey}`);
	const summary = $derived(
		m.logs_day_summary({ n: sessions, duration: formatStoppedDuration(totalMs) })
	);

	/** Writes each row's stack position as CSS variables; the transforms live in the stylesheet. */
	function measure(node: HTMLElement) {
		const items = [...node.children] as HTMLElement[];
		full = node.offsetHeight;
		let card = -1;
		for (const [i, el] of items.entries()) {
			const skip = el.hasAttribute('data-stack-skip');
			if (!skip) card += 1;
			const c = Math.max(card, 0);
			if (c === 0 && !skip) topHeight = el.offsetHeight;
			el.style.setProperty('--k', String(Math.min(c, DEPTH)));
			el.style.setProperty('--i', String(Math.min(c, DEPTH + 1)));
			el.style.setProperty('--o', String(skip ? 0 : (OPACITY[c] ?? 0)));
			el.style.setProperty('--bottom', `${el.offsetTop + el.offsetHeight}px`);
			el.style.zIndex = String(items.length - i);
		}
	}

	function stackRows(node: HTMLElement) {
		const ro = new ResizeObserver(() => measure(node));
		const observe = () => {
			ro.disconnect();
			ro.observe(node);
			for (const el of node.children) ro.observe(el);
			measure(node);
		};
		observe();
		const mo = new MutationObserver(observe);
		mo.observe(node, { childList: true });
		return () => {
			ro.disconnect();
			mo.disconnect();
		};
	}

	function toggle() {
		moving = true;
		open = !open;
	}
</script>

<div class="relative flex items-center gap-2 py-2 {first ? '' : 'mt-2 md:mt-6'}">
	<div class="font-mono text-code-label {today ? 'text-primary' : 'text-on-surface-variant'}">
		{dateKey}
	</div>
	{#if stackable}
		<span class="chevron" data-stacked={stacked || undefined}>
			<IconButton
				icon="expand_more"
				label={stacked
					? m.logs_day_unstack({ n: sessions, date: dateKey })
					: m.logs_day_stack({ date: dateKey })}
				size="sm"
				aria-expanded={!stacked}
				aria-controls={stackId}
				data-testid="log-day-toggle"
				onclick={toggle}
			/>
		</span>
	{/if}
	<div class="ml-2 flex-1 border-t border-dashed border-outline-variant"></div>
	{#if stackable}
		<span
			class="summary absolute right-0 bg-surface pl-3 font-mono text-code-label text-on-surface-variant tabular-nums"
			data-shown={stacked || undefined}
			aria-hidden={!stacked}
		>
			{summary}
		</span>
	{/if}
</div>

<div
	id={stackId}
	class="stack relative"
	data-stacked={stacked || undefined}
	data-moving={moving || undefined}
	data-testid="log-day"
	style:height={full
		? stacked
			? `calc(${topHeight}px + ${depth} * var(--stack-peek))`
			: `${full}px`
		: undefined}
	style:--top="{topHeight}px"
	style:--steps={Math.min(cards - 1, DEPTH + 1)}
	ontransitionend={(e) => {
		if (e.target === e.currentTarget && e.propertyName === 'height') moving = false;
	}}
>
	<div class="rows relative space-y-2" inert={stacked} {@attach stackRows}>
		{@render children()}
	</div>

	{#if stacked}
		<!-- Pointer convenience over the whole stack; the chevron is the keyboard and AT control. -->
		<button
			type="button"
			class="hit absolute inset-0 cursor-pointer rounded-DEFAULT"
			style:z-index={cards + 1}
			tabindex="-1"
			aria-hidden="true"
			onclick={toggle}
		></button>
	{/if}
</div>

<style>
	.stack {
		--stack-peek: 8px;
		--stack-step: 0.04;
		/* Tall back cards would rise above the top one: clip the top edge only, keep focus rings. */
		clip-path: inset(-4px -24px -48px -24px);
	}
	.stack[data-moving] {
		transition: height calc(var(--duration-stack) + var(--steps) * var(--stagger-stack))
			var(--ease-out);
	}

	.rows > :global(*) {
		position: relative;
		transform-origin: 50% 100%;
		transition:
			transform var(--duration-stack) var(--ease-out) calc(var(--i, 0) * var(--stagger-stack)),
			opacity var(--duration-stack) var(--ease-out) calc(var(--i, 0) * var(--stagger-stack));
	}
	/* Each card's bottom edge lands on the top card's, one peek lower per step back. */
	.stack[data-stacked] .rows > :global(*) {
		transform: translateY(calc(var(--top) + var(--k) * var(--stack-peek) - var(--bottom)))
			scale(calc(1 - var(--k) * var(--stack-step)));
		opacity: var(--o);
	}

	.stack[data-stacked]:has(.hit:hover) .rows > :global(:first-child [data-testid='log-row']) {
		border-color: var(--color-outline);
	}

	.chevron :global(button > *) {
		transition: transform 200ms var(--ease-in-out);
	}
	.chevron[data-stacked] :global(button > *) {
		transform: rotate(-90deg);
	}

	.summary {
		opacity: 0;
		transition: opacity var(--duration-stack) var(--ease-out);
	}
	.summary[data-shown] {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.rows > :global(*) {
			transition: opacity var(--duration-stack) var(--ease-out);
		}
		.stack[data-moving],
		.chevron :global(button > *) {
			transition: none;
		}
	}
</style>
