<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PagePlaceholder from './PagePlaceholder.svelte';

	const { Story } = defineMeta({
		title: 'Shell/PagePlaceholder',
		component: PagePlaceholder,
		args: {
			title: 'Coming next',
			description: 'This screen is still a scaffold.'
		}
	});
</script>

<Story name="Default" />
