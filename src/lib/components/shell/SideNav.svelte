<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import BrandMark from './BrandMark.svelte';
	import { profileLabel } from '$lib/api/mappers/profile';
	import ProfileAvatar from './ProfileAvatar.svelte';
	import SessionChip from './SessionChip.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { NAV_ITEMS, isNavActive, isProjectDossier } from './nav';
	import { RailTooltip } from './rail-tooltip.svelte';

	interface Props {
		/** Icon rail instead of the full sidebar (ADR-0029). */
		collapsed?: boolean;
		ontoggle?: () => void;
	}

	let { collapsed = false, ontoggle }: Props = $props();

	const prefsStore = usePrefs();
	const sessionStore = useSession();
	const tooltip = new RailTooltip();
	const onTimer = $derived(isNavActive(page.url.pathname, '/timer'));
	const onDossier = $derived(isProjectDossier(page.url.pathname));
	const showSessionChip = $derived(!onTimer && (Boolean(sessionStore.activeSession) || !onDossier));
	const toggleLabel = $derived(collapsed ? m.shell_sidebar_expand() : m.shell_sidebar_collapse());
	const sessionTip = $derived(
		sessionStore.activeSession
			? `${m.timer_status_active()} · ${sessionStore.elapsedLabel}\n${sessionStore.activeProject?.name ?? m.common_unknown()}`
			: m.nav_start_new_session()
	);
	let commandsBtn: HTMLElement | undefined = $state();

	/** The palette restores focus here on close, so it needs the rendered node. */
	function bindCommandsBtn(node: HTMLElement) {
		commandsBtn = node;
		return () => {
			if (commandsBtn === node) commandsBtn = undefined;
		};
	}

	/** Rail-only tooltip; expanded, the label is already on screen. */
	function railTip(text: () => string) {
		const attach = tooltip.for(text);
		return (node: HTMLElement) => (collapsed ? attach(node) : undefined);
	}
</script>

<nav
	class="fixed top-0 left-0 z-50 hidden h-dvh flex-col border-r border-outline-variant bg-surface py-4 md:flex {collapsed
		? 'w-sidebar-rail'
		: 'w-sidebar'}"
	aria-label={m.nav_main_aria()}
	data-collapsed={collapsed || undefined}
>
	<div
		class="mb-8 flex items-center gap-3 [@media(max-height:30rem)]:mb-3 {collapsed
			? 'justify-center'
			: 'px-6'}"
	>
		<BrandMark class="size-8 shrink-0 text-primary" />
		{#if !collapsed}
			<p class="text-headline-md leading-tight font-bold text-primary">{m.app_name()}</p>
		{/if}
	</div>

	<!--
		The right border is the toggle (ADR-0029): a full-height strip on the line. Hover or
		keyboard focus lights the line and shows the handle level with the logo.
	-->
	<button
		type="button"
		class="group absolute inset-y-0 right-0 z-10 w-3 translate-x-1/2 focus-visible:outline-none {collapsed
			? 'cursor-e-resize'
			: 'cursor-w-resize'}"
		aria-label={toggleLabel}
		aria-expanded={!collapsed}
		data-testid="sidebar-toggle"
		{@attach tooltip.for(
			() => `${toggleLabel}  ⌘B`,
			(node) => node.querySelector<HTMLElement>('[data-handle]') ?? node
		)}
		onclick={() => ontoggle?.()}
	>
		<span
			class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-150 group-hover:bg-primary group-focus-visible:bg-primary motion-reduce:transition-none"
			aria-hidden="true"
		></span>
		<span
			data-handle
			class="absolute top-8 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary bg-surface text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
			aria-hidden="true"
		>
			<Icon name={collapsed ? 'chevron_right' : 'chevron_left'} size="sm" />
		</span>
	</button>

	{#if showSessionChip}
		<div
			class="mb-4 {collapsed ? 'flex justify-center' : 'px-4'}"
			{@attach railTip(() => sessionTip)}
		>
			<SessionChip compact={collapsed} />
		</div>
	{/if}

	<!-- Scrolls on short viewports (phone landscape) so the footer stays reachable (EMI-272). -->
	<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
		{#each NAV_ITEMS as item (item.href)}
			{const active = $derived(isNavActive(page.url.pathname, item.href))}
			<li>
				<a
					href={resolve(item.href)}
					class="focus-ring group flex items-center gap-3 rounded-DEFAULT border-l-2 py-2 transition-colors duration-150 {collapsed
						? 'justify-center'
						: 'px-3'} {active
						? 'border-primary bg-surface-container-high text-primary'
						: 'border-transparent text-on-surface-variant hover:bg-surface-variant hover:text-primary'}"
					aria-current={active ? 'page' : undefined}
					{@attach railTip(() => item.label())}
				>
					<Icon
						name={item.icon}
						size="lg"
						fill={active}
						class="transition-colors {active ? '' : 'group-hover:text-primary'}"
					/>
					<span class={collapsed ? 'sr-only' : 'text-body-md font-medium'}>{item.label()}</span>
				</a>
			</li>
		{/each}
	</ul>

	<div class="mt-auto">
		<div class="pb-2 {collapsed ? 'flex justify-center' : 'px-3'}">
			{#if collapsed}
				<IconButton
					{@attach bindCommandsBtn}
					{@attach railTip(() => `${m.shell_commands()}  ⌘K`)}
					icon="search"
					label={m.shell_commands()}
					onclick={() => commandPalette.show(commandsBtn)}
				/>
			{:else}
				<Button
					{@attach bindCommandsBtn}
					variant="quiet"
					justify="start"
					class="w-full text-on-surface-variant hover:text-primary"
					title="⌘K"
					onclick={() => commandPalette.show(commandsBtn)}
				>
					<kbd
						class="rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px]"
						aria-hidden="true">⌘K</kbd
					>
					<span class="font-mono text-code-label">{m.shell_commands()}</span>
				</Button>
			{/if}
		</div>
		<div class="border-t border-outline-variant pt-3 {collapsed ? 'flex justify-center' : 'px-3'}">
			<a
				href={resolve('/settings')}
				class="focus-ring flex items-center gap-3 rounded-DEFAULT py-2 transition-colors hover:bg-surface-variant {collapsed
					? 'px-2'
					: 'px-3'}"
				aria-label={collapsed ? `${profileLabel(prefsStore)}, ${m.nav_settings()}` : undefined}
				{@attach railTip(() => profileLabel(prefsStore))}
			>
				<ProfileAvatar name={profileLabel(prefsStore)} src={prefsStore.avatarUrl} size="sm" />
				{#if !collapsed}
					<div class="min-w-0">
						<p class="truncate text-body-sm font-medium text-on-surface">
							{profileLabel(prefsStore)}
						</p>
						<p class="truncate font-mono text-[10px] text-on-surface-variant">{prefsStore.email}</p>
					</div>
				{/if}
			</a>
		</div>
	</div>
</nav>

{#if tooltip.open}
	<div
		class="pointer-events-none fixed z-60 max-w-64 -translate-y-1/2 rounded border border-outline-variant bg-surface-container-highest px-2 py-1 font-mono text-code-label whitespace-pre-line text-on-surface shadow-lg"
		style:left="{tooltip.x}px"
		style:top="{tooltip.y}px"
		aria-hidden="true"
	>
		{tooltip.text}
	</div>
{/if}
