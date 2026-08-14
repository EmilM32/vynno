<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { AppSeed } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { prefsStore } from '$lib/stores/prefs.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { resolveTheme } from '$lib/theme/themes';

	let { children, data } = $props();

	const themeColor = $derived(resolveTheme(themeStore.themeId).themeColor);

	function applySeed(seed: AppSeed | null) {
		if (!seed) return;
		prefsStore.hydrateProfile(seed.profile);
		sessionStore.hydrate(seed);
	}

	$effect.pre(() => {
		applySeed(data.seed);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
	<meta name="theme-color" content={themeColor} />
</svelte:head>

{@render children()}
