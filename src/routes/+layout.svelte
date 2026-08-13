<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppShell from '$lib/components/shell/AppShell.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { resolveTheme } from '$lib/theme/themes';

	const themeColor = $derived(resolveTheme(themeStore.themeId).themeColor);

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
	<meta name="theme-color" content={themeColor} />
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
