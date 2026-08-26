<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import BrandMark from './BrandMark.svelte';

	let {
		status,
		mark = false,
		title,
		body,
		detail,
		alert = false,
		testId = 'error-page',
		actions
	}: {
		/** HTTP status shown as mono data. Omit for in-shell seed failure. */
		status?: number;
		/** Login-like brand row. Off when the app shell already shows the mark. */
		mark?: boolean;
		title: string;
		body: string;
		/** Extra line (seed error, DEV-only Kit message). Not the h1. */
		detail?: string;
		/** In-place replacement (loadError) is an alert; a full page is not. */
		alert?: boolean;
		testId?: string;
		actions: Snippet;
	} = $props();

	const statusTone = $derived(status === 404 ? 'text-on-surface' : 'text-error');
</script>

<div
	class="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container p-6"
	role={alert ? 'alert' : undefined}
	data-testid={testId}
>
	{#if mark}
		<div class="mb-6 flex items-center gap-3">
			<BrandMark class="size-8 shrink-0 text-primary" />
			<p class="text-headline-md leading-tight font-bold text-primary">{m.app_name()}</p>
		</div>
	{/if}

	{#if status}
		<p class={['font-mono text-code-display', statusTone]} aria-hidden="true">{status}</p>
	{/if}

	<h1 class={['text-headline-md text-on-surface', status && 'mt-1']}>{title}</h1>
	<p class="mt-2 text-body-md text-on-surface-variant">{body}</p>
	{#if detail}
		<p class="mt-2 font-mono text-code-label text-on-surface-variant">{detail}</p>
	{/if}

	<div class="mt-5 flex flex-col gap-2">
		{@render actions()}
	</div>
</div>
