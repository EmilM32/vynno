<script lang="ts">
	import { resolve } from '$app/paths';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { prefsStore } from '$lib/stores/prefs.svelte';

	function onTargetInput(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		prefsStore.setDailyTargetHours(v);
	}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-8">
	<div class="border-b border-outline-variant pb-4">
		<h1 class="text-headline-lg text-on-surface">Settings</h1>
		<p class="mt-1 text-body-sm text-on-surface-variant">
			Local preferences for this session. Account sync arrives with the API.
		</p>
	</div>

	<!-- Profile -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-profile"
	>
		<h2 id="settings-profile" class="mb-4 text-headline-md text-on-surface">Profile</h2>
		<div class="flex items-center gap-4">
			<div
				class="flex h-14 w-14 shrink-0 items-center justify-center rounded-DEFAULT border border-primary/30 bg-primary/10 font-mono text-lg font-medium text-primary"
				aria-hidden="true"
			>
				{prefsStore.displayName
					.split(/\s+/)
					.map((w) => w[0])
					.join('')
					.slice(0, 2)
					.toUpperCase()}
			</div>
			<div class="min-w-0">
				<p class="text-headline-md text-on-surface">{prefsStore.displayName}</p>
				<p class="font-mono text-code-label text-on-surface-variant">{prefsStore.handle}</p>
			</div>
		</div>
		<p class="mt-3 text-body-sm text-outline">Mock profile — not editable in this build.</p>
	</section>

	<!-- Preferences -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-prefs"
	>
		<h2 id="settings-prefs" class="mb-4 text-headline-md text-on-surface">Preferences</h2>
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label class="text-body-md text-on-surface" for="daily-target">
					Daily hour target
					<span class="mt-0.5 block text-body-sm text-on-surface-variant">
						Used for Insights “vs target” average.
					</span>
				</label>
				<input
					id="daily-target"
					type="number"
					min="1"
					max="16"
					step="0.5"
					value={prefsStore.dailyTargetHours}
					oninput={onTargetInput}
					class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface outline-none sm:w-28"
				/>
			</div>

			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label class="text-body-md text-on-surface" for="default-project">
					Default project
					<span class="mt-0.5 block text-body-sm text-on-surface-variant">
						Pre-selected on Timer when idle (unless a recent task overrides).
					</span>
				</label>
				<select
					id="default-project"
					class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface outline-none sm:w-56"
					bind:value={prefsStore.defaultProjectId}
					onchange={() => {
						// Keep timer draft in sync when idle
						if (!sessionStore.activeSession) {
							sessionStore.draftProjectId = prefsStore.defaultProjectId;
						}
					}}
				>
					{#each sessionStore.projects as project (project.id)}
						<option value={project.id}>{project.name}</option>
					{/each}
				</select>
			</div>
			<p class="text-body-sm text-on-surface-variant">
				<a
					href={resolve('/projects')}
					class="focus-ring text-primary underline-offset-2 hover:underline"
				>
					Manage projects
				</a>
				— create, archive, or recolor work containers.
			</p>
		</div>
	</section>

	<!-- Coming later -->
	<section
		class="rounded-lg border border-dashed border-outline-variant bg-surface-container/40 p-4"
		aria-labelledby="settings-later"
	>
		<h2 id="settings-later" class="mb-2 text-headline-md text-on-surface-variant">Coming later</h2>
		<ul class="list-inside list-disc space-y-1 text-body-sm text-outline">
			<li>Theme — dark only for v1</li>
			<li>Notifications &amp; calendar integrations</li>
			<li>Account / auth (separate backend)</li>
			<li>Persisted preferences across devices</li>
		</ul>
	</section>
</div>
