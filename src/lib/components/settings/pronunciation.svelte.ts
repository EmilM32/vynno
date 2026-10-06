/**
 * Plays the bundled "VIN-oh" clip in Settings → About (EMI-197).
 *
 * The `Audio` element is created on the first `play()`, so nothing is fetched on page
 * view. Playing again restarts from the start. A blocked, unsupported or broken clip
 * just returns to idle: no throw, no banner.
 */
export class PronunciationPlayer {
	playing = $state(false);

	#src: string;
	#audio: HTMLAudioElement | undefined;

	constructor(src: string) {
		this.#src = src;
	}

	play = (): void => {
		const audio = this.#element();
		if (!audio) return;
		audio.currentTime = 0;
		this.playing = true;
		audio.play().catch(this.#idle);
	};

	#idle = (): void => {
		this.playing = false;
	};

	#element(): HTMLAudioElement | undefined {
		if (this.#audio || typeof Audio === 'undefined') return this.#audio;
		try {
			this.#audio = new Audio(this.#src);
		} catch {
			return undefined;
		}
		for (const type of ['ended', 'pause', 'error']) {
			this.#audio.addEventListener(type, this.#idle);
		}
		return this.#audio;
	}
}
