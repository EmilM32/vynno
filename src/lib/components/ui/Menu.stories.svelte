<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import Menu from './Menu.svelte';
	import MenuItem from './MenuItem.svelte';

	const { Story } = defineMeta({
		title: 'UI/Menu',
		component: Menu,
		args: {
			label: 'More actions'
		}
	});

	const archive = fn();
	const remove = fn();
</script>

<!--
	Props are passed explicitly rather than with `{...args}`: `children` is a required
	prop, so spreading it would collide with the markup each story supplies.
	The wrapper leaves room for the popover, which opens under the trigger's right edge.
-->

<Story name="Default">
	{#snippet template()}
		<div class="flex h-40 items-start justify-end">
			<Menu label="More actions">
				<MenuItem onselect={archive}>Archive</MenuItem>
				<MenuItem tone="danger" onselect={remove}>Delete</MenuItem>
			</Menu>
		</div>
	{/snippet}
</Story>

<Story name="Open">
	{#snippet template()}
		<div class="flex h-40 items-start justify-end">
			<Menu label="More actions" open>
				<MenuItem onselect={archive}>Archive</MenuItem>
				<MenuItem tone="danger" onselect={remove}>Delete</MenuItem>
			</Menu>
		</div>
	{/snippet}
</Story>

<!-- A disabled item stays in the menu with its reason for screen readers (ProjectRow). -->
<Story name="DisabledItem">
	{#snippet template()}
		<div class="flex h-40 items-start justify-end">
			<Menu label="More actions" open>
				<MenuItem onselect={archive}>Archive</MenuItem>
				<MenuItem tone="danger" disabled aria-describedby="story-delete-reason" onselect={remove}
					>Delete</MenuItem
				>
			</Menu>
			<span id="story-delete-reason" class="sr-only">This project still has sessions.</span>
		</div>
	{/snippet}
</Story>
