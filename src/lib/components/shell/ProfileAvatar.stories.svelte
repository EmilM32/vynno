<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProfileAvatar from './ProfileAvatar.svelte';

	const { Story } = defineMeta({
		title: 'Shell/ProfileAvatar',
		component: ProfileAvatar,
		args: { name: 'Alex Dev', size: 'md' }
	});
</script>

<Story name="Initials" />

<Story name="Small" args={{ size: 'sm' }} />

<Story name="Large" args={{ size: 'lg' }} />
