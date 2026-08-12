<script lang="ts">
	import { sessionStore } from '$lib/stores/session.svelte';
	import RecentTasks from './RecentTasks.svelte';
	import TaskInput from './TaskInput.svelte';
	import TimerCard from './TimerCard.svelte';
</script>

<div class="mx-auto flex w-full max-w-[600px] flex-col gap-8">
	{#if sessionStore.error}
		<div
			class="rounded border border-error/40 bg-error-container/20 px-3 py-2 font-mono text-code-label text-error"
			role="alert"
		>
			{sessionStore.error}
		</div>
	{/if}

	<TaskInput />
	<TimerCard />
	<RecentTasks />
</div>
