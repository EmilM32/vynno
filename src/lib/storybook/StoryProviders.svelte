<script lang="ts">
	import { MemoryTimeTrackingRepository } from '$lib/data/memory-repository';
	import { createPrefsStore, setPrefs } from '$lib/stores/prefs.svelte';
	import { createSessionStore, setSession } from '$lib/stores/session.svelte';
	import type { Snippet } from 'svelte';
	import { storySeed, STORY_NOW } from './seed';

	let { children }: { children: Snippet } = $props();

	const seed = storySeed();
	const prefs = createPrefsStore();
	prefs.hydrateProfile(seed.profile);
	setPrefs(prefs);

	const session = createSessionStore(prefs);
	session.hydrate(seed, {
		nowMs: STORY_NOW.getTime(),
		repo: new MemoryTimeTrackingRepository(seed)
	});
	setSession(session);
</script>

{@render children()}
