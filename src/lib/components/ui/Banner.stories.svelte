<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import Banner from './Banner.svelte';
	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'UI/Banner',
		component: Banner,
		args: {
			tone: 'error'
		}
	});
</script>

<Story name="Default">
	{#snippet template()}
		<Banner>Could not reach the API.</Banner>
	{/snippet}
</Story>

<Story name="WithDismiss">
	{#snippet template()}
		<Banner>
			Could not reach the API.
			{#snippet action()}
				<Button variant="inline" size="xs" onclick={fn()}>Dismiss</Button>
			{/snippet}
		</Banner>
	{/snippet}
</Story>

<Story name="Notice">
	{#snippet template()}
		<Banner tone="notice">
			Session running for 4h 12m.
			{#snippet action()}
				<Button variant="inline" size="xs" onclick={fn()}>Keep going</Button>
			{/snippet}
		</Banner>
	{/snippet}
</Story>
