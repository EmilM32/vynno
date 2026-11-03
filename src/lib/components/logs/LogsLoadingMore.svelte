<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<!-- Infinite-scroll loader: a primary segment sweeping along the day-header hairline. -->
<div
	role="status"
	aria-live="polite"
	class="loader mt-2 py-2 md:mt-6"
	data-testid="logs-loading-more"
>
	<span class="sr-only">{m.logs_loading_earlier()}</span>
	<div class="track relative border-t border-dashed border-outline-variant" aria-hidden="true">
		<div class="sweep absolute -top-px left-0 h-px w-1/4 bg-primary"></div>
	</div>
</div>

<style>
	/* A fast page lands before this shows, so the line does not flash. */
	.loader {
		animation: appear 0ms 150ms both;
	}
	@keyframes appear {
		from {
			opacity: 0;
		}
	}

	.track {
		overflow-x: clip;
	}
	.sweep {
		animation: sweep 1100ms var(--ease-in-out) infinite;
	}
	@keyframes sweep {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(400%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sweep {
			animation: none;
			width: 100%;
			opacity: 0.5;
		}
	}
</style>
