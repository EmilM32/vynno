<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BrandMark from './BrandMark.svelte';

	const { Story } = defineMeta({
		title: 'Shell/BrandMark',
		component: BrandMark,
		args: { class: 'size-8 text-primary' }
	});
</script>

<Story name="Default" />

<Story name="Large" args={{ class: 'size-16 text-primary' }} />
