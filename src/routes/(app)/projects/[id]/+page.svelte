<script lang="ts">
	import ProjectView from '$lib/components/project/ProjectView.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	let { params }: { params: { id: string } } = $props();

	const sessionStore = useSession();
	const project = $derived(sessionStore.getProject(params.id));
	const pageTitle = $derived(project?.name ?? m.error_not_found());
</script>

<svelte:head>
	<title>{m.title_app({ page: pageTitle })}</title>
</svelte:head>

{#key params.id}
	<ProjectView projectId={params.id} />
{/key}
