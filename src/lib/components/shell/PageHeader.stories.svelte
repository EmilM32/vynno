<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import PageHeader from './PageHeader.svelte';

	const { Story } = defineMeta({
		title: 'Shell/PageHeader',
		component: PageHeader,
		args: {
			title: 'Logs',
			description: 'Stopped sessions. Filter, edit, or add a manual entry.',
			showDescriptionOnMobile: false
		}
	});
</script>

<Story name="Default" />

<Story name="WithActions">
	{#snippet template(args)}
		<PageHeader {...args} title="Projects" description="Active and archived workstreams.">
			{#snippet actions()}
				<button
					type="button"
					class="press focus-ring min-h-10 rounded bg-primary px-3 py-2 text-body-md font-medium text-on-primary"
				>
					New project
				</button>
			{/snippet}
		</PageHeader>
	{/snippet}
</Story>

<Story name="WithLeadingAndExtra">
	{#snippet template(args)}
		<PageHeader {...args} title="Identity" description="AUTH · 12 sessions">
			{#snippet leading()}
				<div class="h-3.5 w-3.5 rounded-sm bg-[#3b82f6]" aria-hidden="true"></div>
			{/snippet}
			{#snippet titleExtra()}
				<ActivityChip type={{ id: 'act-deep', name: 'Deep Work', color: 'primary' }} />
			{/snippet}
		</PageHeader>
	{/snippet}
</Story>

<Story name="CompactOnScroll">
	{#snippet template(args)}
		<div id="main-content" class="h-72 overflow-y-auto rounded-lg border border-outline-variant">
			<PageHeader {...args} />
			<div class="h-[120vh] px-4 py-6 text-body-sm text-on-surface-variant">
				Scroll this pane on a desktop-width canvas. The subtitle collapses when the header pins.
			</div>
		</div>
	{/snippet}
</Story>
