<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './Button.svelte';
	import Disclosure from './Disclosure.svelte';
	import Field from './Field.svelte';
	import Input from './Input.svelte';

	const { Story } = defineMeta({
		title: 'UI/Disclosure',
		component: Disclosure,
		args: {
			title: 'Security'
		}
	});
</script>

<!--
	Props are passed explicitly rather than with `{...args}`: `children` is a required
	prop, so spreading it would collide with the markup each story supplies.
-->

{#snippet card(open: boolean)}
	<section class="max-w-2xl rounded-lg border border-outline-variant bg-surface-container p-4">
		<Disclosure title="Security" {open}>
			<p class="text-body-md text-on-surface-variant">
				Change the password or the sign-in email. Other devices are signed out.
			</p>
		</Disclosure>
	</section>
{/snippet}

<Story name="Collapsed">
	{#snippet template()}
		{@render card(false)}
	{/snippet}
</Story>

<Story name="Open">
	{#snippet template()}
		{@render card(true)}
	{/snippet}
</Story>

<!-- Type in the field, collapse, expand: the value is still there (the panel stays mounted). -->
<Story name="WithForm">
	{#snippet template()}
		<section class="max-w-2xl rounded-lg border border-outline-variant bg-surface-container p-4">
			<Disclosure title="Security" open>
				<form class="flex flex-col gap-4" onsubmit={(e) => e.preventDefault()}>
					<Field id="story-current-password" label="Current password">
						<Input type="password" class="w-full" />
					</Field>
					<div>
						<Button variant="tonal" type="submit">Change password</Button>
					</div>
				</form>
			</Disclosure>
		</section>
	{/snippet}
</Story>
