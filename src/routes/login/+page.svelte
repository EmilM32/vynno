<script lang="ts">
	import LoginView from '$lib/components/auth/LoginView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_login() })}</title>
</svelte:head>

<LoginView />
