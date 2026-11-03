<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description = '',
		actions,
		actionsClass = '',
		eyebrow,
		leading,
		titleExtra,
		meta,
		showDescriptionOnMobile = false
	}: {
		title: string;
		description?: string;
		actions?: Snippet;
		/** Layout on the actions slot (e.g. hide the desktop CTA on small screens). */
		actionsClass?: string;
		eyebrow?: Snippet;
		leading?: Snippet;
		titleExtra?: Snippet;
		/** Live context after the title (date, week, counts). Mono, replaces a static description. */
		meta?: Snippet;
		/** Keep the subtitle on small screens when it is the actual message, not chrome. */
		showDescriptionOnMobile?: boolean;
	} = $props();

	let compact = $state(false);

	const DESKTOP_MQ = '(min-width: 768px)';

	function watchPin(node: HTMLElement) {
		const mq = window.matchMedia(DESKTOP_MQ);
		const root = node.closest('#main-content');

		const setHeaderHeight = () => {
			if (!(root instanceof HTMLElement)) return;
			root.style.setProperty('--page-header-h', mq.matches ? `${node.offsetHeight}px` : '0px');
		};

		const sync = () => {
			compact = mq.matches && !!root && root.scrollTop > 0;
			setHeaderHeight();
		};

		const ro = new ResizeObserver(setHeaderHeight);
		ro.observe(node);
		root?.addEventListener('scroll', sync, { passive: true });
		mq.addEventListener('change', sync);
		sync();

		return () => {
			ro.disconnect();
			root?.removeEventListener('scroll', sync);
			mq.removeEventListener('change', sync);
			if (root instanceof HTMLElement) root.style.removeProperty('--page-header-h');
		};
	}
</script>

<!--
	A toolbar row, not a title block: the title, then live context, then actions. It bleeds to
	the edges of #main-content on desktop and rules itself off only once content scrolls under it.
-->
<header
	class="hairline border-b bg-surface md:sticky md:top-0 md:z-20 md:-mx-margin-desktop md:flex md:min-h-14 md:items-center md:px-margin-desktop md:py-1.5"
	data-testid="page-header"
	data-compact={compact}
	{@attach watchPin}
>
	<div
		class={[
			'flex w-full flex-col justify-between gap-4 md:gap-3',
			actions && 'sm:flex-row sm:flex-wrap sm:items-center'
		]}
	>
		<!--
			Desktop is one row while it fits. Too narrow for the actions, they wrap to a second row;
			within the title row the context truncates first (shrink 999), then the title.
			Phones stack instead.
		-->
		<div class="flex min-w-0 flex-col gap-2 sm:flex-auto md:flex-row md:items-center md:gap-x-3">
			{#if eyebrow}
				<div class="flex shrink-0 items-center gap-3">
					{@render eyebrow()}
					<span class="hidden h-4 w-px bg-outline-variant md:block" aria-hidden="true"></span>
				</div>
			{/if}
			<div class="flex min-w-0 flex-wrap items-center gap-2 md:flex-nowrap">
				<!-- Leading mark and title wrap as one unit; a long title gets two lines on phones (EMI-269). -->
				<div class="flex min-w-0 items-center gap-2">
					{#if leading}
						<div class="shrink-0">{@render leading()}</div>
					{/if}
					<h1
						class="min-w-0 text-headline-md wrap-break-word text-on-surface max-md:line-clamp-2 md:truncate"
						{title}
					>
						<bdi>{title}</bdi>
					</h1>
				</div>
				{#if titleExtra}
					<div class="flex min-w-0 flex-wrap items-center gap-2 md:shrink-0">
						{@render titleExtra()}
					</div>
				{/if}
			</div>
			{#if meta || description}
				<div
					class={[
						'min-w-0 items-center gap-3 md:shrink-999 md:overflow-hidden',
						meta || showDescriptionOnMobile ? 'flex' : 'hidden md:flex'
					]}
				>
					<span class="hidden h-4 w-px shrink-0 bg-outline-variant md:block" aria-hidden="true"
					></span>
					{#if meta}
						<p
							class="min-w-0 font-mono text-code-label text-on-surface-variant tabular-nums md:truncate"
						>
							{@render meta()}
						</p>
					{:else}
						<p
							class="min-w-0 text-body-sm text-pretty text-on-surface-variant md:truncate"
							title={description}
							data-testid="page-header-description"
						>
							{description}
						</p>
					{/if}
				</div>
			{/if}
		</div>
		{#if actions}
			<div class={['w-full sm:ml-auto sm:w-auto sm:shrink-0', actionsClass]}>
				{@render actions()}
			</div>
		{/if}
	</div>
</header>

<style>
	/* Nothing to separate until content scrolls under the pinned row. */
	.hairline {
		border-color: transparent;
		transition: border-color var(--duration-ui) ease;
	}

	.hairline[data-compact='true'] {
		border-color: var(--color-outline-variant);
	}
</style>
