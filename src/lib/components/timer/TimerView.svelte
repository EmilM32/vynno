<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Banner from '$lib/components/ui/Banner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import RecentTasks from './RecentTasks.svelte';
	import TaskInput from './TaskInput.svelte';
	import TimerCard from './TimerCard.svelte';
	import TodaySummary from './TodaySummary.svelte';

	const sessionStore = useSession();

	const status = $derived(sessionStore.activeSession?.status);
	const sessionChrome = $derived(
		status === 'active' ? 'border-primary' : 'border-outline-variant'
	);
</script>

<div
	class="mx-auto flex w-full max-w-[600px] flex-col gap-8 md:mx-0 md:max-w-none"
	data-testid="page-view"
>
	<PageHeader title={m.timer_title()} />

	{#if sessionStore.error}
		<Banner>
			{sessionStore.error}
			{#snippet action()}
				<Button variant="inline" size="xs" onclick={() => sessionStore.clearError()}>
					{m.common_dismiss()}
				</Button>
			{/snippet}
		</Banner>
	{/if}

	<div
		class="flex flex-col overflow-hidden rounded-lg border bg-surface-container {sessionChrome}"
		data-testid="timer-session"
	>
		<div class="border-b border-outline-variant px-4 py-3 lg:px-5">
			<TaskInput />
		</div>
		<TimerCard />
		<TodaySummary />
	</div>
	<RecentTasks />
</div>
