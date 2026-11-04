import { getContext, hasContext, setContext } from 'svelte';

const KEY = Symbol('vynno-log-day-stack');

/**
 * Wired by `LogDayStack` so a row inside it can react to the day stacking —
 * an expanded group folds back so the stack keeps its card height.
 * A getter, not a snapshot: the day toggles.
 */
export type DayStackContext = {
	readonly stacked: boolean;
};

export function setDayStackContext(ctx: DayStackContext): DayStackContext {
	return setContext(KEY, ctx);
}

export function getDayStackContext(): DayStackContext | undefined {
	return hasContext(KEY) ? getContext<DayStackContext>(KEY) : undefined;
}
