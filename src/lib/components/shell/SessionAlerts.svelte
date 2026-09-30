<script lang="ts">
	import { onMount } from 'svelte';
	import { announce } from '$lib/a11y/announce';
	import { m } from '$lib/paraglide/messages.js';
	import { notificationPrefs, notify } from '$lib/stores/notifications.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatCompact } from '$lib/time/duration';
	import { ThresholdWatch } from './threshold-watch';

	/**
	 * Headless: watches the live session from the shell so alerts fire on any screen.
	 * The clock only ticks while a live session has something to watch.
	 */
	const sessionStore = useSession();
	const targetWatch = new ThresholdWatch();

	onMount(() => notificationPrefs.load());

	$effect(() => {
		const live = sessionStore.activeSession;
		const target = live?.targetDurationMs;
		if (!live || !target) return;
		if (!targetWatch.crossed(live.id, sessionStore.elapsedMs, target)) return;
		announce(m.announce_target_reached());
		notify(m.notify_target_title({ target: formatCompact(target) }), {
			body: live.note,
			tag: `vynno-target-${live.id}`
		});
	});
</script>
