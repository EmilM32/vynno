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
		/** True for a moment after a toggle, so only a toggle fades the swapped controls in. */
		gliding?: boolean;
		ontoggle?: () => void;
	}

	let { collapsed = false, gliding = false, ontoggle }: Props = $props();

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

<!--
	One markup for both widths (ADR-0029 §6): every control keeps its x position, so only the
	width and the label opacity change while the rail glides. The nav is not clipped itself,
	so the border toggle can straddle the line; the inner column clips the labels.
-->
<nav
	class="side-nav fixed top-0 left-0 z-50 hidden h-dvh border-r border-outline-variant bg-surface md:block {collapsed
		? 'w-sidebar-rail'
		: 'w-sidebar'}"
	aria-label={m.nav_main_aria()}
	data-collapsed={collapsed || undefined}
	data-gliding={gliding || undefined}
>
	<div class="flex h-full flex-col overflow-hidden py-4">
		<div class="mb-8 flex items-center gap-3 px-5 [@media(max-height:30rem)]:mb-3">
			<BrandMark class="size-8 shrink-0 text-primary" />
			<p
				class="rail-label text-headline-md leading-tight font-bold whitespace-nowrap text-primary"
				aria-hidden={collapsed || undefined}
			>
				{m.app_name()}
			</p>
		</div>

		{#if showSessionChip}
			{#if collapsed}
				<div
					class="rail-swap mb-4 ml-3 flex w-12 justify-center"
					{@attach railTip(() => sessionTip)}
				>
					<SessionChip compact />
				</div>
			{:else}
				<div class="rail-swap mb-4 w-sidebar px-4">
					<SessionChip />
				</div>
			{/if}
		{/if}

		<!-- Scrolls on short viewports (phone landscape) so the footer stays reachable (EMI-272). -->
		<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3">
			{#each NAV_ITEMS as item (item.href)}
				{const active = $derived(isNavActive(page.url.pathname, item.href))}
				<li>
					<a
						href={resolve(item.href)}
						class="focus-ring group flex items-center gap-3 rounded-DEFAULT border-l-2 px-3 py-2 whitespace-nowrap transition-colors duration-150 {active
							? 'border-primary bg-surface-container-high text-primary'
							: 'border-transparent text-on-surface-variant hover:bg-surface-variant hover:text-primary'}"
						aria-current={active ? 'page' : undefined}
						{@attach railTip(() => item.label())}
					>
						<Icon
							name={item.icon}
							size="lg"
							fill={active}
							class="shrink-0 transition-colors {active ? '' : 'group-hover:text-primary'}"
						/>
						<span class="rail-label text-body-md font-medium">{item.label()}</span>
					</a>
				</li>
			{/each}
		</ul>

		<div class="mt-auto">
			{#if collapsed}
				<div class="rail-swap ml-3 flex w-12 justify-center pb-2">
					<IconButton
						{@attach bindCommandsBtn}
						{@attach railTip(() => `${m.shell_commands()}  ⌘K`)}
						icon="search"
						label={m.shell_commands()}
						onclick={() => commandPalette.show(commandsBtn)}
					/>
				</div>
			{:else}
				<div class="rail-swap w-sidebar px-3 pb-2">
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
				</div>
			{/if}
			<div class="border-t border-outline-variant px-3 pt-3">
				<a
					href={resolve('/settings')}
					class="focus-ring flex items-center gap-3 rounded-DEFAULT px-1.5 py-2 whitespace-nowrap transition-colors hover:bg-surface-variant"
					aria-label={collapsed ? `${profileLabel(prefsStore)}, ${m.nav_settings()}` : undefined}
					{@attach railTip(() => profileLabel(prefsStore))}
				>
					<ProfileAvatar name={profileLabel(prefsStore)} src={prefsStore.avatarUrl} size="sm" />
					<div class="rail-label min-w-0">
						<p class="truncate text-body-sm font-medium text-on-surface">
							{profileLabel(prefsStore)}
						</p>
						<p class="truncate font-mono text-[10px] text-on-surface-variant">{prefsStore.email}</p>
					</div>
				</a>
			</div>
		</div>
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

<style>
	/* The glide (ADR-0029 §6). AppShell moves the main column's margin on the same timing. */
	.side-nav {
		transition: width var(--duration-ui) var(--ease-in-out);
	}

	/* Labels leave in the first 40% and return in the last 60%, clear of the moving edge. */
	.rail-label {
		transition: opacity calc(var(--duration-ui) * 0.6) var(--ease-out)
			calc(var(--duration-ui) * 0.4);
	}
	.side-nav[data-collapsed] .rail-label {
		opacity: 0;
		transition: opacity calc(var(--duration-ui) * 0.4) var(--ease-out);
	}

	/*
	 * The wide and rail forms swap; the incoming one fades in on the labels' timing. Only
	 * during a toggle — first paint and route changes (the chip hides on Timer) stay still.
	 */
	.side-nav[data-gliding] .rail-swap {
		transition: opacity calc(var(--duration-ui) * 0.6) var(--ease-out)
			calc(var(--duration-ui) * 0.4);
		@starting-style {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.side-nav,
		.rail-label,
		.side-nav[data-gliding] .rail-swap {
			transition: none;
		}
	}
</style>
