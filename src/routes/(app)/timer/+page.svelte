<script lang="ts">
	import PageTitle from '$lib/components/shell/PageTitle.svelte';
	import TimerView from '$lib/components/timer/TimerView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<PageTitle page={m.title_timer()} />

<TimerView />
