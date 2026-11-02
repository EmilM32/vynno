<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const samples = [
		['headline-lg', 'text-headline-lg font-sans', 'Where the hours went'],
		['headline-md', 'text-headline-md font-sans', 'Identity / AUTH'],
		['body-md', 'text-body-md font-sans', 'Stopped sessions for the selected project.'],
		[
			'body-sm',
			'text-body-sm font-sans',
			'Optional subtitle kept on mobile when it is the message.'
		],
		['code-display', 'text-code-display font-mono', '01:24:08'],
		['code-label', 'text-code-label font-mono', 'TODAY  /  3h 12m'],
		['code-data', 'text-code-data font-mono', '> wire session hydrate']
	] as const;

	/** Inter for words, mono for anything read as data. */
	const families = [
		['Project name', 'Inter', 'text-body-md', 'vynno-api'],
		['Duration', 'mono · code-data', 'font-mono text-code-data tabular-nums', '2h 14m'],
		['Project code', 'mono · code-label', 'font-mono text-code-label', 'VYN'],
		['Clock range', 'mono · code-label', 'font-mono text-code-label tabular-nums', '09:12 – 11:26'],
		['Button label', 'Inter', 'text-body-md', 'Start session']
	] as const;

	const { Story } = defineMeta({
		title: 'Foundations/Type',
		parameters: {
			docs: {
				description: {
					component:
						'The scale is closed: these seven utilities plus the two micro-label sizes. Body text is 14px; nothing read as a sentence goes below 12px. Rules: [docs/design-system/typography.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/typography.md).'
				}
			}
		}
	});
</script>

<Story name="Scale">
	{#snippet template()}
		<ul class="flex flex-col gap-5">
			{#each samples as [token, className, sample] (token)}
				<li class="border-b border-outline-variant pb-4">
					<p class="mb-1 font-mono text-[10px] tracking-wide text-on-surface-variant uppercase">
						{token}
					</p>
					<p class="text-on-surface {className}">{sample}</p>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story name="Inter or mono">
	{#snippet template()}
		<ul class="flex flex-col gap-2">
			{#each families as [what, family, className, sample] (what)}
				<li
					class="grid grid-cols-[8rem_9rem_1fr] items-baseline gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2"
				>
					<span class="text-body-sm text-on-surface-variant">{what}</span>
					<span class="font-mono text-code-label text-on-surface-variant">{family}</span>
					<span class="text-on-surface {className}">{sample}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story name="Micro labels">
	{#snippet template()}
		<p class="mb-4 text-body-sm text-on-surface-variant">
			The only arbitrary sizes allowed. One or two words, never a sentence, never below 10px.
		</p>
		<div class="flex flex-col gap-4">
			<div class="rounded-lg border border-outline-variant bg-surface-container p-4">
				<p class="font-mono text-[10px] tracking-wider text-on-surface-variant uppercase">
					text-[10px] · eyebrow over a metric
				</p>
				<p class="mt-2 font-mono text-code-display text-on-surface tabular-nums">06h 42m</p>
			</div>
			<div class="flex items-center gap-2">
				<kbd
					class="rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant"
					>⌘K</kbd
				>
				<span class="text-body-sm text-on-surface-variant">text-[10px] · keyboard hint</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="font-mono text-[11px] text-on-surface-variant tabular-nums">08:00</span>
				<span class="text-body-sm text-on-surface-variant"
					>text-[11px] · chart axis ticks, bottom-nav labels</span
				>
			</div>
		</div>
	{/snippet}
</Story>
