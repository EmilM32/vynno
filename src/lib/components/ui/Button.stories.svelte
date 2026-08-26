<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import Banner from './Banner.svelte';
	import Button, { type ButtonSize, type ButtonVariant } from './Button.svelte';
	import Icon from './Icon.svelte';

	const { Story } = defineMeta({
		title: 'UI/Button',
		component: Button,
		args: {
			variant: 'secondary',
			size: 'md',
			disabled: false,
			onclick: fn()
		}
	});

	const VARIANTS: ButtonVariant[] = [
		'primary',
		'neutral',
		'secondary',
		'tonal',
		'danger',
		'danger-filled',
		'quiet',
		'inline',
		'link',
		'tab'
	];

	const SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg'];
</script>

<!--
	Props are passed explicitly rather than with `{...args}`: `children` is a required
	prop, so spreading it would collide with the markup each story supplies.
-->

{#snippet label(text: string)}
	<span class="font-mono text-code-label text-on-surface-variant">{text}</span>
{/snippet}

<Story name="Default">
	{#snippet template(args)}
		<Button variant={args.variant} size={args.size} disabled={args.disabled} onclick={args.onclick}>
			Archive
		</Button>
	{/snippet}
</Story>

<!--
	The page that proves consistency. Switch Dark / Light / Deep Dark in the toolbar:
	every cell must stay legible, and the focus ring must stay visible on the filled
	variants (that is what `focus-ring`'s 1px outline-offset buys).
-->
<Story name="Matrix">
	{#snippet template()}
		<div class="flex flex-col gap-6">
			{#each VARIANTS as variant (variant)}
				<div class="flex flex-col gap-2">
					{@render label(variant)}
					<div class="flex flex-wrap items-center gap-3">
						{#each SIZES as size (size)}
							<Button {variant} {size}>Archive</Button>
						{/each}
						<Button {variant} disabled>Disabled</Button>
					</div>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-wrap items-center gap-3">
			{#each SIZES as size (size)}
				<Button variant={args.variant} {size}>Size {size}</Button>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Primary" args={{ variant: 'primary' }}>
	{#snippet template(args)}
		<Button variant={args.variant} size={args.size} disabled={args.disabled} onclick={args.onclick}>
			Create project
		</Button>
	{/snippet}
</Story>

<Story name="Danger" args={{ variant: 'danger' }}>
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="danger">Delete</Button>
			<Button variant="danger-filled">Delete</Button>
		</div>
	{/snippet}
</Story>

<!-- Timer transport: `lg` pairs a filled primary with a filled neutral. -->
<Story name="Transport">
	{#snippet template()}
		<div class="flex max-w-[280px] gap-3">
			<Button variant="neutral" size="lg" class="flex-1">
				<Icon name="pause" size="2xl" class="text-tertiary-fixed" />
				Pause
			</Button>
			<Button variant="primary" size="lg" class="flex-1">
				<Icon name="stop" size="lg" fill />
				Stop
			</Button>
		</div>
	{/snippet}
</Story>

<Story name="WithIcon" args={{ variant: 'primary' }}>
	{#snippet template(args)}
		<Button variant={args.variant} size={args.size} disabled={args.disabled} onclick={args.onclick}>
			<Icon name="play_arrow" />
			Start session
		</Button>
	{/snippet}
</Story>

<!--
	ARIA stays with the caller: `selected` only styles the segment, so a tab strip can
	use `role="tab" aria-selected` and a segmented control can use `aria-pressed`.
-->
<Story name="Tabs">
	{#snippet template()}
		<div
			class="inline-flex gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container p-1"
			role="group"
			aria-label="Period"
		>
			<Button variant="tab" size="sm" selected aria-pressed="true">Week</Button>
			<Button variant="tab" size="sm" aria-pressed="false">Month</Button>
			<Button variant="tab" size="sm" aria-pressed="false">All</Button>
		</div>
	{/snippet}
</Story>

<!-- `inline` inherits the surrounding ink so it works inside a coloured banner. -->
<Story name="InlineAndLink">
	{#snippet template()}
		<div class="flex flex-col gap-4">
			<Banner>
				Could not reach the API.
				{#snippet action()}
					<Button variant="inline" size="xs">Dismiss</Button>
				{/snippet}
			</Banner>
			<p class="text-body-md text-on-surface-variant">
				No projects yet. <Button variant="link" size="sm">Create one</Button>
			</p>
		</div>
	{/snippet}
</Story>

<!-- `href` renders an `<a>`; `disabled` then becomes `aria-disabled`. -->
<Story name="AsLink">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="primary" href="#top">
				<Icon name="play_arrow" />
				Start new session
			</Button>
			<Button variant="secondary" href="#top" disabled>Unavailable</Button>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="primary" size={args.size} disabled={args.disabled}>Primary</Button>
			<Button variant="secondary" size={args.size} disabled={args.disabled}>Secondary</Button>
			<Button variant="danger" size={args.size} disabled={args.disabled}>Danger</Button>
		</div>
	{/snippet}
</Story>
