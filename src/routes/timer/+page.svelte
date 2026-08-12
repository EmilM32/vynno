<script lang="ts">
	import TimerView from '$lib/components/timer/TimerView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_timer() })}</title>
</svelte:head>

<TimerView />
