<script lang="ts">
	import type { AppSeed } from '$lib/api/types';
	import { MemoryTimeTrackingRepository } from '$lib/data/memory-repository';
	import { createPrefsStore, setPrefs } from '$lib/stores/prefs.svelte';
	import { createSessionStore, setSession } from '$lib/stores/session.svelte';
	import { untrack, type Snippet } from 'svelte';
	import { storySeed, STORY_NOW } from './seed';

	let {
		children,
		seed,
		nowMs = STORY_NOW.getTime()
	}: {
		children: Snippet;
		seed?: AppSeed;
		nowMs?: number;
	} = $props();

	const resolved = untrack(() => seed ?? storySeed());
	const clock = untrack(() => nowMs);
	const prefs = createPrefsStore();
	prefs.hydrateProfile(resolved.profile);
	setPrefs(prefs);

	const session = createSessionStore(prefs);
	session.reset();
	session.hydrate(resolved, {
		nowMs: clock,
		repo: new MemoryTimeTrackingRepository(resolved)
	});
	setSession(session);
</script>

{@render children()}
