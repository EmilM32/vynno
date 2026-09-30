<script lang="ts">
	import { useSession } from '$lib/stores/session.svelte';
	import { documentTitle } from './document-title';

	/** The one `<title>` per screen. Svelte sets `document.title` from the last writer. */
	let { page }: { page: string } = $props();

	const sessionStore = useSession();
	const live = $derived(sessionStore.activeSession);
	const title = $derived(
		documentTitle(page, live ? { clock: sessionStore.elapsedLabel, task: live.note } : null)
	);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>
