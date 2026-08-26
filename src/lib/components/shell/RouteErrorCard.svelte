<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import { errorPageCopy } from '$lib/errors/page-copy';
	import { m } from '$lib/paraglide/messages.js';
	import ErrorState from './ErrorState.svelte';

	let { mark = false }: { mark?: boolean } = $props();

	const copy = $derived(errorPageCopy(page.status));
	const loggedIn = $derived(Boolean(page.data.loggedIn));
	const kitMessage = $derived(page.error?.message ?? '');
	const devDetail = $derived(
		import.meta.env.DEV &&
			kitMessage &&
			kitMessage !== 'Not Found' &&
			kitMessage !== 'Internal Error'
			? kitMessage
			: ''
	);
</script>

<svelte:head>
	<title>{m.title_app({ page: copy.documentTitle })}</title>
</svelte:head>

<ErrorState
	status={page.status}
	{mark}
	title={copy.title}
	body={copy.body}
	detail={devDetail || undefined}
>
	{#snippet actions()}
		<Button variant="primary" class="w-full" href={resolve(loggedIn ? '/dashboard' : '/login')}>
			{loggedIn ? m.error_page_go_dashboard() : m.login_submit()}
		</Button>
		{#if copy.retry}
			<Button variant="secondary" class="w-full" onclick={() => location.reload()}>
				{m.error_load_retry()}
			</Button>
		{/if}
	{/snippet}
</ErrorState>
