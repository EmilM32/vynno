<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		actions,
		eyebrow,
		leading,
		titleExtra,
		showDescriptionOnMobile = false
	}: {
		title: string;
		description: string;
		actions?: Snippet;
		eyebrow?: Snippet;
		leading?: Snippet;
		titleExtra?: Snippet;
		/** Keep the subtitle on small screens when it is the actual message, not chrome. */
		showDescriptionOnMobile?: boolean;
	} = $props();

	let compact = $state(false);

	const DESKTOP_MQ = '(min-width: 768px)';

	function watchPin(node: HTMLElement) {
		const mq = window.matchMedia(DESKTOP_MQ);
		const root = node.closest('#main-content');

		const sync = () => {
			compact = mq.matches && !!root && root.scrollTop > 0;
		};

		root?.addEventListener('scroll', sync, { passive: true });
		mq.addEventListener('change', sync);
		sync();

		return () => {
			root?.removeEventListener('scroll', sync);
			mq.removeEventListener('change', sync);
		};
	}
</script>

<header
	class="border-b border-outline-variant bg-surface pb-4 md:sticky md:top-0 md:z-20 md:pt-6"
	data-testid="page-header"
	data-compact={compact}
	{@attach watchPin}
>
	<div
		class={[
			'flex flex-col justify-between gap-4',
			actions && 'sm:flex-row sm:items-end sm:justify-between'
		]}
	>
		<div class="min-w-0">
			{#if eyebrow}
				<div class="mb-2">{@render eyebrow()}</div>
			{/if}
			<div class="flex min-w-0 flex-wrap items-center gap-2">
				{#if leading}
					<div class="shrink-0">{@render leading()}</div>
				{/if}
				<h1 class="min-w-0 truncate text-headline-lg text-on-surface">{title}</h1>
				{#if titleExtra}
					<div class="flex min-w-0 flex-wrap items-center gap-2">{@render titleExtra()}</div>
				{/if}
			</div>
			<div class={['desc', compact && 'desc-compact']} aria-hidden={compact}>
				<p
					class={[
						'mt-1 text-body-sm text-on-surface-variant',
						!showDescriptionOnMobile && 'hidden md:block'
					]}
					data-testid="page-header-description"
				>
					{description}
				</p>
			</div>
		</div>
		{#if actions}
			<div class="w-full sm:w-auto sm:shrink-0">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>

<style>
	.desc {
		display: grid;
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.desc > :global(p) {
		min-height: 0;
		overflow: hidden;
	}

	.desc-compact {
		grid-template-rows: 0fr;
		opacity: 0;
	}

	@media (min-width: 768px) {
		.desc {
			transition:
				grid-template-rows var(--duration-ui) var(--ease-in-out),
				opacity var(--duration-ui) var(--ease-in-out);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.desc {
			transition: opacity var(--duration-ui) ease;
		}
	}
</style>
