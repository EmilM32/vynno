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

	const { Story } = defineMeta({
		title: 'Foundations/Type'
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
