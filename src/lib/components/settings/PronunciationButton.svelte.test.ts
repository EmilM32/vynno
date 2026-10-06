import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import PronunciationButton from './PronunciationButton.svelte';

describe('PronunciationButton (EMI-197)', () => {
	it('renders a labelled button and nothing that would load the clip', () => {
		const { body } = render(PronunciationButton);
		const button = body.match(/<button[^>]*>/)?.[0] ?? '';
		expect(button).toContain('type="button"');
		expect(button).toContain(`aria-label="${m.settings_about_play_pronunciation()}"`);
		expect(button).not.toContain('aria-pressed');
		expect(body).not.toContain('<audio');
		expect(body).not.toContain('.mp3');
	});
});
