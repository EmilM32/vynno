<script lang="ts" module>
	export type ChipVariant = 'code' | 'tag' | 'ticket';

	const VARIANT: Record<ChipVariant, string> = {
		code: 'rounded bg-surface-container-high px-1.5 py-0.5 text-on-surface-variant',
		tag: 'rounded-DEFAULT border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary',
		ticket:
			'rounded-DEFAULT border border-outline-variant bg-surface-container-high px-2 py-0.5 text-primary'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: ChipVariant;
		class?: string;
		children: Snippet;
	}

	let { variant = 'code', class: className = '', children }: Props = $props();
</script>

<span class="font-mono text-code-label {VARIANT[variant]} {className}">{@render children()}</span>
