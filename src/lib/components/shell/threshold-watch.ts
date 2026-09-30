/**
 * Reports the tick on which a live session first crosses a duration. Time that
 * was already past on first sight (a reload, a tab opened late) never alerts.
 */
export class ThresholdWatch {
	#lastElapsed = new Map<string, number>();

	crossed(sessionId: string, elapsedMs: number, thresholdMs: number): boolean {
		const previous = this.#lastElapsed.get(sessionId);
		this.#lastElapsed.set(sessionId, elapsedMs);
		return previous !== undefined && previous < thresholdMs && elapsedMs >= thresholdMs;
	}
}
