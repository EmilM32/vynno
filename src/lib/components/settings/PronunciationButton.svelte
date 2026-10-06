<script lang="ts">
	import pronunciationUrl from '$lib/assets/vynno-pronunciation.mp3';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { PronunciationPlayer } from './pronunciation.svelte';

	const player = new PronunciationPlayer(pronunciationUrl);
</script>

<!--
	No `aria-pressed`: a second click restarts the clip rather than stopping it, so this is
	not a toggle. Playing shows as primary ink and a filled glyph; the label stays put.
-->
<IconButton
	icon="play_arrow"
	label={m.settings_about_play_pronunciation()}
	size="sm"
	selected={player.playing}
	fill={player.playing}
	onclick={player.play}
/>
