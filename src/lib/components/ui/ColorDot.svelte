<script lang="ts" module>
	export type ColorDotSize = 'sm' | 'md';

	/** `sm` is the 8px list mark; `md` is the 14px row/header square. */
	const SIZE: Record<ColorDotSize, string> = {
		sm: 'h-2 w-2 rounded-full',
		md: 'h-3.5 w-3.5 rounded-sm'
	};
</script>

<script lang="ts">
	interface Props {
		color: string;
		size?: ColorDotSize;
		class?: string;
	}

	let { color, size = 'sm', class: className = '' }: Props = $props();
</script>

<span
	class="inline-block shrink-0 {SIZE[size]} {className}"
	style:background-color={color}
	aria-hidden="true"
></span>
