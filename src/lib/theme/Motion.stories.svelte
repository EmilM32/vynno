<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from '$lib/components/ui/Button.svelte';

	const durations = [
		['--duration-press', '160ms', '.press scale on chrome'],
		['--duration-tooltip', '150ms', 'Reserved for tooltips (rail tooltips have none)'],
		['--duration-ui', '200ms', 'Dialog enter, header collapse'],
		['--duration-ui-exit', '150ms', 'Dialog exit — leaves faster than it came'],
		['--duration-sheet', '260ms', 'Bottom drawer enter'],
		['--duration-sheet-exit', '200ms', 'Bottom drawer exit']
	] as const;

	const { Story } = defineMeta({
		title: 'Foundations/Motion',
		parameters: {
			docs: {
				description: {
					component:
						'Two curves and six durations — do not invent a third curve. Run the gate in [docs/motion.md](https://github.com/EmilM32/vynno/blob/main/docs/motion.md) before animating anything.'
				}
			}
		}
	});
</script>

<script lang="ts">
	let moved = $state(false);
</script>

<Story name="Tokens">
	{#snippet template()}
		<ul class="flex flex-col gap-2">
			{#each durations as [token, ms, use] (token)}
				<li class="grid grid-cols-[12rem_4rem_1fr] items-baseline gap-3">
					<span class="font-mono text-code-label text-on-surface">{token}</span>
					<span class="font-mono text-code-label text-on-surface-variant">{ms}</span>
					<span class="text-body-sm text-on-surface-variant">{use}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story name="Curves">
	{#snippet template()}
		<div class="flex flex-col gap-4">
			<Button size="sm" onclick={() => (moved = !moved)}>Play</Button>
			{#each ['--ease-out', '--ease-in-out'] as curve (curve)}
				<div class="flex flex-col gap-1">
					<p class="font-mono text-code-label text-on-surface-variant">
						{curve} · var(--duration-ui)
					</p>
					<div class="h-8 rounded-DEFAULT border border-outline-variant bg-surface-container-low">
						<div
							class="h-full w-8 rounded-DEFAULT bg-primary"
							style:transform={moved ? 'translateX(16rem)' : 'none'}
							style:transition="transform var(--duration-ui) var({curve})"
						></div>
					</div>
				</div>
			{/each}
			<p class="text-body-sm text-on-surface-variant">
				<code>--ease-out</code> for anything entering, exiting or pressed;
				<code>--ease-in-out</code> for something already on screen that moves. Never
				<code>ease-in</code>.
			</p>
		</div>
	{/snippet}
</Story>

<Story name="Press">
	{#snippet template()}
		<div class="flex gap-2">
			<Button variant="primary">Has .press</Button>
			<Button variant="tab" size="sm">tab — no press</Button>
		</div>
	{/snippet}
</Story>
