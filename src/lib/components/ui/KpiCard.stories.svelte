<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import KpiCard from './KpiCard.svelte';

	const { Story } = defineMeta({
		title: 'UI/KpiCard',
		component: KpiCard,
		args: {
			label: 'Total time',
			value: '12h 40m',
			caption: 'this week',
			valueTone: 'primary'
		}
	});
</script>

<Story name="Default" />

<Story name="Row">
	{#snippet template()}
		<div class="grid grid-cols-3 gap-gutter">
			<KpiCard label="Total time" value="12h 40m" caption="this week" valueTone="primary" />
			<KpiCard label="Most productive" value="Tue" caption="3.2h peak" />
			<KpiCard
				label="Daily average"
				value="2h 32m"
				caption="+8% vs target"
				captionTone="positive"
			/>
		</div>
	{/snippet}
</Story>

<Story name="Empty">
	{#snippet template()}
		<KpiCard label="Most productive" value="—" />
	{/snippet}
</Story>

<Story name="NegativeDelta">
	{#snippet template()}
		<KpiCard label="Daily average" value="1h 12m" caption="−12% vs target" captionTone="negative" />
	{/snippet}
</Story>
