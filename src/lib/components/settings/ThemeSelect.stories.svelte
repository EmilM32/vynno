<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ThemeSelect from './ThemeSelect.svelte';

	const { Story } = defineMeta({
		title: 'Settings/ThemeSelect',
		component: ThemeSelect
	});
</script>

<Story name="Default" />
