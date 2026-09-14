<script lang="ts">
	import './layout.css';
	import { untrack } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { m } from '$lib/paraglide/messages.js';
	import { authStore } from '$lib/stores/auth.svelte';
	import { createPrefsStore, setPrefs } from '$lib/stores/prefs.svelte';
	import { createSessionStore, setSession } from '$lib/stores/session.svelte';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { resolveTheme } from '$lib/theme/themes';
	import { persistTimeZoneCookie } from '$lib/time/timezone';

	let { children, data } = $props();

	const prefs = createPrefsStore();
	const session = createSessionStore(prefs);
	setPrefs(prefs);
	setSession(session);

	function applySeed() {
		if (!data.seed) return;
		prefs.hydrateProfile(data.seed.profile);
		prefs.applyStored(data.prefs);
		session.hydrate(data.seed, { nowMs: data.nowMs, timeZone: data.timeZone });
	}

	// Synchronous so SSR HTML matches hydrate. `$effect.pre` covers login → app
	// without remounting this layout.
	applySeed();

	$effect.pre(() => {
		applySeed();
	});

	const themeColor = $derived(resolveTheme(themeStore.themeId).themeColor);

	$effect(() => {
		persistTimeZoneCookie();
		if (data.seed) {
			const email = data.seed.profile.email;
			// `loggedIn` is a de-dupe check here, not a trigger. Tracked, `clearSession()` flipping
			// it to false re-runs this effect while `data` is still the pre-logout seed, which
			// restores the cached email that logout had just removed.
			if (email && !untrack(() => authStore.loggedIn)) {
				authStore.applySession(email);
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
	<meta name="theme-color" content={themeColor} />
</svelte:head>

{@render children()}
