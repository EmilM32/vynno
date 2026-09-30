<script lang="ts">
	import SettingsView from '$lib/components/settings/SettingsView.svelte';
	import PageTitle from '$lib/components/shell/PageTitle.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<PageTitle page={m.title_settings()} />

<SettingsView />
