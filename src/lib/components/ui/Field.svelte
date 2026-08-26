<script lang="ts" module>
	export type FieldLayout = 'stack' | 'split';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setFieldContext } from './field-context';

	interface Props {
		id: string;
		label: string;
		hint?: string;
		error?: string;
		layout?: FieldLayout;
		/**
		 * Layout utilities ONLY — flex, width, margin. Never padding, radius,
		 * border or type scale: those come from `layout`.
		 */
		class?: string;
		children: Snippet;
		/** Rendered inside the label, after the text (optional suffix, etc.). */
		extra?: Snippet;
	}

	let {
		id,
		label,
		hint = '',
		error = '',
		layout = 'stack',
		class: className = '',
		children,
		extra
	}: Props = $props();

	const hintId = $derived(hint ? `${id}-hint` : undefined);
	const errorId = $derived(error ? `${id}-error` : undefined);
	const describedBy = $derived([errorId, hintId].filter(Boolean).join(' ') || undefined);

	setFieldContext({
		get id() {
			return id;
		},
		get describedBy() {
			return describedBy;
		},
		get invalid() {
			return Boolean(error);
		}
	});
</script>

{#if layout === 'split'}
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between {className}">
		<label class="text-body-md text-on-surface" for={id}>
			{label}
			{#if extra}{@render extra()}{/if}
			{#if hint}
				<span id={hintId} class="mt-0.5 block text-body-sm text-on-surface-variant">{hint}</span>
			{/if}
		</label>
		{@render children()}
	</div>
	{#if error}
		<p id={errorId} class="text-body-sm text-error" role="alert">{error}</p>
	{/if}
{:else}
	<div class="flex flex-col gap-1.5 {className}">
		<label class="text-body-sm text-on-surface-variant" for={id}>
			{label}
			{#if extra}{@render extra()}{/if}
		</label>
		{@render children()}
		{#if hint}
			<p id={hintId} class="text-body-sm text-on-surface-variant">{hint}</p>
		{/if}
		{#if error}
			<p id={errorId} class="text-body-sm text-error" role="alert">{error}</p>
		{/if}
	</div>
{/if}
