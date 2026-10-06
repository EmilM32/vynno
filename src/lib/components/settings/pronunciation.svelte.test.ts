import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PronunciationPlayer } from './pronunciation.svelte';

/** Just enough of `HTMLAudioElement` for the player: events, `currentTime`, `play()`. */
class FakeAudio extends EventTarget {
	static instances: FakeAudio[] = [];
	currentTime = 0;
	play = vi.fn(() => Promise.resolve());

	constructor(public src: string) {
		super();
		FakeAudio.instances.push(this);
	}
}

const SRC = '/_app/immutable/assets/vynno-pronunciation.abc123.mp3';

/** Lets a rejected `play()` promise reach its `.catch`. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('PronunciationPlayer', () => {
	beforeEach(() => {
		FakeAudio.instances = [];
		vi.stubGlobal('Audio', FakeAudio);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('creates no audio until the first play', () => {
		const player = new PronunciationPlayer(SRC);
		expect(FakeAudio.instances).toHaveLength(0);
		expect(player.playing).toBe(false);
	});

	it('creates the audio on the first play and starts it', () => {
		const player = new PronunciationPlayer(SRC);
		player.play();
		expect(FakeAudio.instances).toHaveLength(1);
		const [audio] = FakeAudio.instances;
		expect(audio!.src).toBe(SRC);
		expect(audio!.play).toHaveBeenCalledTimes(1);
		expect(player.playing).toBe(true);
	});

	it('restarts the same clip from the start on a second play', () => {
		const player = new PronunciationPlayer(SRC);
		player.play();
		const [audio] = FakeAudio.instances;
		audio!.currentTime = 0.3;
		player.play();
		expect(FakeAudio.instances).toHaveLength(1);
		expect(audio!.currentTime).toBe(0);
		expect(audio!.play).toHaveBeenCalledTimes(2);
		expect(player.playing).toBe(true);
	});

	it.each(['ended', 'pause', 'error'])('returns to idle on %s', (type) => {
		const player = new PronunciationPlayer(SRC);
		player.play();
		FakeAudio.instances[0]!.dispatchEvent(new Event(type));
		expect(player.playing).toBe(false);
	});

	it('returns to idle without throwing when play() is rejected', async () => {
		const player = new PronunciationPlayer(SRC);
		player.play();
		const [audio] = FakeAudio.instances;
		audio!.play.mockReturnValueOnce(Promise.reject(new DOMException('blocked', 'NotAllowedError')));
		expect(() => player.play()).not.toThrow();
		await flush();
		expect(player.playing).toBe(false);
	});

	it('does nothing without an Audio constructor', () => {
		vi.stubGlobal('Audio', undefined);
		const player = new PronunciationPlayer(SRC);
		expect(() => player.play()).not.toThrow();
		expect(player.playing).toBe(false);
	});

	it('does nothing when the Audio constructor throws', () => {
		vi.stubGlobal(
			'Audio',
			vi.fn(() => {
				throw new Error('unsupported');
			})
		);
		const player = new PronunciationPlayer(SRC);
		expect(() => player.play()).not.toThrow();
		expect(player.playing).toBe(false);
	});
});
