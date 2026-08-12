<script lang="ts">
	import ProjectsView from '$lib/components/projects/ProjectsView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_projects() })}</title>
</svelte:head>

<ProjectsView />
