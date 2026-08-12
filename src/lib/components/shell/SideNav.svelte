<script lang="ts">
	import { page } from '$app/state';
	import { APP_NAME, APP_VERSION, NAV_ITEMS, isNavActive } from './nav';
</script>

<nav
	class="fixed top-0 left-0 z-50 hidden h-screen w-sidebar flex-col border-r border-outline-variant bg-surface py-4 md:flex"
	aria-label="Main"
>
	<div class="mb-8 flex items-center gap-3 px-6">
		<span class="material-symbols-outlined text-3xl text-primary" aria-hidden="true">timer</span>
		<div>
			<h1 class="text-headline-md leading-tight font-bold text-primary">{APP_NAME}</h1>
			<p class="font-mono text-[10px] text-on-surface-variant uppercase opacity-70">
				{APP_VERSION}
			</p>
		</div>
	</div>

	<div class="mb-4 px-4">
		<a
			href="/timer"
			class="flex w-full items-center justify-center gap-2 rounded-DEFAULT border border-primary/20 bg-primary px-4 py-2 font-mono text-code-data font-medium text-background transition-colors hover:bg-primary-container"
		>
			<span class="material-symbols-outlined text-[18px]" aria-hidden="true">play_arrow</span>
			Start New Session
		</a>
	</div>

	<ul class="flex flex-1 flex-col gap-1 px-3">
		{#each NAV_ITEMS as item (item.href)}
			{@const active = isNavActive(page.url.pathname, item.href)}
			<li>
				<a
					href={item.href}
					class="group flex items-center gap-3 rounded-DEFAULT border-l-2 px-3 py-2 transition-colors duration-150 {active
						? 'border-primary bg-surface-container-high text-primary'
						: 'border-transparent text-on-surface-variant hover:bg-surface-variant hover:text-primary'}"
					aria-current={active ? 'page' : undefined}
				>
					<span
						class="material-symbols-outlined text-[20px] transition-colors {active
							? ''
							: 'group-hover:text-primary'}"
						style={active ? "font-variation-settings: 'FILL' 1" : undefined}
						aria-hidden="true">{item.icon}</span
					>
					<span class="text-body-md font-medium">{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
