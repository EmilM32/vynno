<!--
	Test fixture: renders `component` under a session context so components that call
	`useSession()` can be server-rendered in unit tests.
-->
<script lang="ts">
	import type { Component } from 'svelte';
	import { setSession, type SessionStore } from '$lib/stores/session.svelte';

	let {
		store,
		component: Inner,
		props = {}
	}: {
		store: SessionStore;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any component under test
		component: Component<any>;
		props?: Record<string, unknown>;
	} = $props();

	// svelte-ignore state_referenced_locally
	setSession(store);
</script>

<Inner {...props} />
