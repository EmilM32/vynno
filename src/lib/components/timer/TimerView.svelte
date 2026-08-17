<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import RecentTasks from './RecentTasks.svelte';
	import TaskInput from './TaskInput.svelte';
	import TimerCard from './TimerCard.svelte';
	import TodaySummary from './TodaySummary.svelte';

	const sessionStore = useSession();

	const status = $derived(sessionStore.activeSession?.status);
	const sessionChrome = $derived(
		status === 'active'
			? 'lg:border-primary lg:pulse-border'
			: status === 'paused'
				? 'lg:border-tertiary/60'
				: 'lg:border-outline-variant'
	);
</script>

<div
	class="mx-auto flex w-full max-w-[600px] flex-col gap-8 md:mx-0 md:max-w-none"
	data-testid="page-view"
>
	<PageHeader title={m.timer_title()} description={m.timer_subtitle()} />

	{#if sessionStore.error}
		<div
			class="flex items-start justify-between gap-3 rounded border border-error/40 bg-error-container/20 px-3 py-2 font-mono text-code-label text-error"
			role="alert"
		>
			<span>{sessionStore.error}</span>
			<button
				type="button"
				class="focus-ring shrink-0 underline"
				onclick={() => sessionStore.clearError()}>{m.common_dismiss()}</button
			>
		</div>
	{/if}

	<div
		class="flex flex-col gap-6 lg:gap-0 lg:overflow-hidden lg:rounded-lg lg:border lg:bg-surface-container {sessionChrome}"
		data-testid="timer-session"
	>
		<div class="lg:border-b lg:border-outline-variant lg:px-5 lg:py-3">
			<TaskInput />
		</div>
		<TimerCard />
		<TodaySummary />
	</div>
	<RecentTasks />
</div>
