import { getContext, hasContext, setContext } from 'svelte';

const KEY = Symbol('vynno-field');

/**
 * Wired by `Field` so nested `Input` / `Select` inherit `id`, `aria-invalid`,
 * and `aria-describedby`. Getters, not a snapshot — the parent props change.
 */
export type FieldContext = {
	readonly id: string;
	readonly describedBy: string | undefined;
	readonly invalid: boolean;
};

export function setFieldContext(ctx: FieldContext): FieldContext {
	return setContext(KEY, ctx);
}

export function getFieldContext(): FieldContext | undefined {
	return hasContext(KEY) ? getContext<FieldContext>(KEY) : undefined;
}
