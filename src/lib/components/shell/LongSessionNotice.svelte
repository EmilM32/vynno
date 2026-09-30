<script lang="ts">
	import Banner from '$lib/components/ui/Banner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { defaultStopAtMs, longSessionPrefs } from '$lib/stores/long-session.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { sessionTimeRejectMessage } from '$lib/text/field-error';
	import { datetimeLocalToIso, formatCompact, isoToDatetimeLocal } from '$lib/time/duration';
	import { checkSessionTimes } from '$lib/time/session-bounds';

	/**
	 * Forgotten-timer guard: once one live session passes the reminder threshold,
	 * every screen asks whether it is still running on purpose.
	 */
	const sessionStore = useSession();

	const live = $derived(sessionStore.activeSession);
	const threshold = $derived(longSessionPrefs.thresholdMs);
	const show = $derived(
		live != null &&
			threshold != null &&
			longSessionPrefs.dismissedId !== live.id &&
			sessionStore.elapsedMs >= threshold
	);
	const pending = $derived(sessionStore.busy);

	let stopAtOpen = $state(false);
	let finishedAt = $state('');
	let submitError = $state('');

	const finishedIso = $derived(datetimeLocalToIso(finishedAt));
	const timeError = $derived.by(() => {
		if (!live) return '';
		if (!finishedIso) return sessionTimeRejectMessage('invalid');
		const reject = checkSessionTimes(
			Date.parse(live.startedAt),
			Date.parse(finishedIso),
			sessionStore.serverNowMs()
		);
		return reject ? sessionTimeRejectMessage(reject) : '';
	});

	function startedLabel(iso: string): string {
		return new Intl.DateTimeFormat(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: sessionStore.timeZone
		}).format(new Date(iso));
	}

	function openStopAt() {
		if (!live || threshold == null) return;
		const guess = defaultStopAtMs(
			Date.parse(live.startedAt),
			threshold,
			sessionStore.serverNowMs()
		);
		finishedAt = isoToDatetimeLocal(new Date(guess).toISOString());
		submitError = '';
		stopAtOpen = true;
	}

	async function submitStopAt(close: () => void) {
		if (timeError || !finishedIso || pending) return;
		if (await sessionStore.stopAt(finishedIso)) close();
		else submitError = sessionStore.error ?? m.error_failed_stop();
	}
</script>

{#if show && live}
	<div class="pt-2 pb-4 md:pt-6 md:pb-0" data-testid="long-session-notice">
		<Banner tone="notice">
			<p class="font-medium">
				{m.long_session_title({ elapsed: formatCompact(sessionStore.elapsedMs) })}
			</p>
			<p class="mt-0.5 truncate font-mono text-code-label text-on-surface-variant">
				&gt; <bdi>{live.note}</bdi>
			</p>
			<p class="mt-1 text-on-surface-variant">{m.long_session_question()}</p>
			{#snippet action()}
				<div class="flex flex-wrap justify-end gap-2">
					<Button
						variant="inline"
						size="xs"
						disabled={pending}
						onclick={() => longSessionPrefs.dismiss(live.id)}
					>
						{m.long_session_keep()}
					</Button>
					<Button variant="secondary" size="xs" disabled={pending} onclick={openStopAt}>
						{m.long_session_stop_at()}
					</Button>
					<Button
						variant="primary"
						size="xs"
						disabled={pending}
						onclick={() => sessionStore.stop()}
					>
						{m.long_session_stop_now()}
					</Button>
				</div>
			{/snippet}
		</Banner>
	</div>
{/if}

<Dialog
	open={stopAtOpen}
	title={m.long_session_dialog_title()}
	onclose={() => (stopAtOpen = false)}
>
	{#snippet children({ close })}
		<form
			class="flex flex-col gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				void submitStopAt(() => close());
			}}
		>
			<Field
				id="long-session-finished-at"
				label={m.long_session_finished_at()}
				hint={live ? m.long_session_started({ time: startedLabel(live.startedAt) }) : ''}
				error={timeError || submitError}
			>
				<Input
					tone="data"
					type="datetime-local"
					bind:value={finishedAt}
					min={live ? isoToDatetimeLocal(live.startedAt) : undefined}
					class="w-full"
				/>
			</Field>
			<div class="flex flex-wrap justify-end gap-2">
				<Button variant="secondary" onclick={() => close()}>{m.common_cancel()}</Button>
				<Button variant="primary" type="submit" disabled={Boolean(timeError) || pending}>
					{m.command_stop_session()}
				</Button>
			</div>
		</form>
	{/snippet}
</Dialog>
