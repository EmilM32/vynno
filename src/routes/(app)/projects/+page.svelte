<script lang="ts">
	import ProjectsView from '$lib/components/projects/ProjectsView.svelte';
	import PageTitle from '$lib/components/shell/PageTitle.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<PageTitle page={m.title_projects()} />

<ProjectsView />
