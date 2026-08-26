<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Field from './Field.svelte';
	import Icon from './Icon.svelte';
	import Input, { type InputSize, type InputTone } from './Input.svelte';

	const { Story } = defineMeta({
		title: 'UI/Input',
		component: Input,
		args: {
			tone: 'ui',
			size: 'md',
			disabled: false,
			placeholder: 'Identity'
		}
	});

	const TONES: InputTone[] = ['ui', 'data', 'code'];
	const SIZES: InputSize[] = ['sm', 'md'];
</script>

{#snippet label(text: string)}
	<span class="font-mono text-code-label text-on-surface-variant">{text}</span>
{/snippet}

<Story name="Default">
	{#snippet template(args)}
		<Input
			tone={args.tone}
			size={args.size}
			disabled={args.disabled}
			placeholder={args.placeholder}
			class="w-full max-w-sm"
		/>
	{/snippet}
</Story>

<!--
	The page that proves consistency. Switch Dark / Light / Deep Dark in the toolbar:
	every cell must stay legible, and :focus-visible must recast the border to primary
	(the on-border treatment — not the chrome `.focus-ring`).
-->
<Story name="Matrix">
	{#snippet template()}
		<div class="flex flex-col gap-6">
			{#each TONES as tone (tone)}
				<div class="flex flex-col gap-2">
					{@render label(tone)}
					<div class="flex flex-wrap items-end gap-3">
						{#each SIZES as size (size)}
							<Input {tone} {size} placeholder="Size {size}" class="w-48" />
						{/each}
						<Input {tone} disabled placeholder="Disabled" class="w-48" />
					</div>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Search">
	{#snippet template()}
		<Input type="search" tone="code" size="sm" placeholder="Filter by note or project" class="w-64">
			{#snippet leading()}
				<Icon name="search" />
			{/snippet}
		</Input>
	{/snippet}
</Story>

<Story name="InField">
	{#snippet template()}
		<Field id="session-note" label="Task" error="Enter a note.">
			<Input tone="data" placeholder="> wire session hydrate" />
		</Field>
	{/snippet}
</Story>
