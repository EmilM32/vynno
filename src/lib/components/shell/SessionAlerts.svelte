<script lang="ts">
	import { onMount } from 'svelte';
	import { announce } from '$lib/a11y/announce';
	import { m } from '$lib/paraglide/messages.js';
	import { longSessionPrefs } from '$lib/stores/long-session.svelte';
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
	const longWatch = new ThresholdWatch();

	onMount(() => {
		notificationPrefs.load();
		longSessionPrefs.load();
	});

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

	// The banner (LongSessionNotice) covers time already past; this only marks the crossing.
	$effect(() => {
		const live = sessionStore.activeSession;
		const threshold = longSessionPrefs.thresholdMs;
		if (!live || threshold == null) return;
		const elapsed = sessionStore.elapsedMs;
		if (!longWatch.crossed(live.id, elapsed, threshold)) return;
		const label = formatCompact(elapsed);
		announce(m.long_session_title({ elapsed: label }));
		notify(m.notify_long_session_title({ elapsed: label }), {
			body: live.note,
			tag: `vynno-long-${live.id}`
		});
	});
</script>
