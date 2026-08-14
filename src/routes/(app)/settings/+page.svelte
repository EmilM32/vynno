<script lang="ts">
	import SettingsView from '$lib/components/settings/SettingsView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_settings() })}</title>
</svelte:head>

<SettingsView />
