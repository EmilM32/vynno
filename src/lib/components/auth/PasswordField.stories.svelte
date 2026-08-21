<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PasswordField from './PasswordField.svelte';

	const { Story } = defineMeta({
		title: 'Auth/PasswordField',
		component: PasswordField,
		args: {
			id: 'story-password',
			label: 'Password',
			value: 'local-dev-password'
		}
	});
</script>

<Story name="Default" />

<Story
	name="Error"
	args={{
		value: '',
		error: 'Password must be at least 8 characters.'
	}}
/>
