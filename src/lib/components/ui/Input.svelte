<script lang="ts" module>
	export type InputTone = 'ui' | 'data' | 'code';
	export type InputSize = 'sm' | 'md';

	const TONE: Record<InputTone, string> = {
		ui: 'text-body-md',
		data: 'font-mono text-code-data',
		code: 'font-mono text-code-label'
	};

	const SIZE: Record<InputSize, string> = {
		sm: 'min-h-8 py-1.5',
		md: 'min-h-10 py-2.5'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { getFieldContext } from './field-context';

	interface Props extends Omit<HTMLInputAttributes, 'class' | 'size' | 'value' | 'maxlength'> {
		tone?: InputTone;
		size?: InputSize;
		value?: string | number;
		maxlength?: number | string;
		/**
		 * Layout utilities ONLY — flex, width, margin. Never padding, radius,
		 * border or type scale: those come from `tone` and `size`.
		 */
		class?: string;
		leading?: Snippet;
		trailing?: Snippet;
	}

	let {
		id,
		tone = 'ui',
		size = 'md',
		value = $bindable<string | number>(''),
		maxlength,
		class: className = '',
		leading,
		trailing,
		disabled = false,
		...rest
	}: Props = $props();

	const field = getFieldContext();
	const inputId = $derived(id ?? field?.id);
	const describedBy = $derived(
		[field?.describedBy, rest['aria-describedby']].filter(Boolean).join(' ') || undefined
	);
	const invalid = $derived(field?.invalid ? true : rest['aria-invalid']);
	const padded = $derived(Boolean(leading || trailing));
	const maxLength = $derived(maxlength == null || maxlength === '' ? undefined : Number(maxlength));
</script>

{#snippet control()}
	<input
		{...rest}
		id={inputId}
		bind:value
		{disabled}
		maxlength={maxLength}
		aria-invalid={invalid}
		aria-describedby={describedBy}
		class={[
			'appearance-none rounded border border-outline-variant bg-surface-container-low text-on-surface',
			'placeholder:text-on-surface-variant',
			'disabled:cursor-not-allowed disabled:opacity-60',
			'[&::-webkit-search-decoration]:appearance-none [&::-webkit-search-cancel-button]:appearance-none',
			TONE[tone],
			SIZE[size],
			leading && trailing ? 'pr-11 pl-9' : leading ? 'pr-3 pl-9' : trailing ? 'pr-11 pl-3' : 'px-3',
			padded ? 'w-full' : className
		]}
	/>
{/snippet}

{#if padded}
	<div class="group relative {className}">
		{#if leading}
			<span
				class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-on-surface-variant transition-colors group-focus-within:text-primary"
			>
				{@render leading()}
			</span>
		{/if}
		{@render control()}
		{#if trailing}{@render trailing()}{/if}
	</div>
{:else}
	{@render control()}
{/if}
