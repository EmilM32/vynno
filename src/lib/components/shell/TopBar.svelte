<script lang="ts">
	import { APP_NAME } from './nav';

	let { title = '' }: { title?: string } = $props();
</script>

<header
	class="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface px-4 md:hidden"
>
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-xl text-primary" aria-hidden="true">terminal</span>
		<span class="text-headline-md font-bold text-primary">{APP_NAME}</span>
	</div>
	{#if title}
		<span class="text-body-sm text-on-surface-variant">{title}</span>
	{/if}
</header>
