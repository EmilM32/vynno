<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from '$lib/components/ui/Button.svelte';
	import ErrorState from './ErrorState.svelte';

	const { Story } = defineMeta({
		title: 'Shell/ErrorState',
		component: ErrorState
	});
</script>

<Story name="NotFound">
	{#snippet template()}
		<ErrorState status={404} mark title="Page not found" body="That path isn't a Vynno screen.">
			{#snippet actions()}
				<Button variant="primary" class="w-full">Log in</Button>
			{/snippet}
		</ErrorState>
	{/snippet}
</Story>

<Story name="Internal">
	{#snippet template()}
		<ErrorState
			status={500}
			mark
			title="Something went wrong"
			body="The request failed. Retry, or continue to a known screen."
		>
			{#snippet actions()}
				<Button variant="primary" class="w-full">Go to Dashboard</Button>
				<Button variant="secondary" class="w-full">Retry</Button>
			{/snippet}
		</ErrorState>
	{/snippet}
</Story>

<Story name="InShellLoadError">
	{#snippet template()}
		<ErrorState
			alert
			testId="load-error"
			title="Couldn't load workspace"
			body="Check your connection and try again."
			detail="Failed to load workspace"
		>
			{#snippet actions()}
				<Button variant="primary" class="w-full">Retry</Button>
			{/snippet}
		</ErrorState>
	{/snippet}
</Story>
