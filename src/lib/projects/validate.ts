import { m } from '$lib/paraglide/messages.js';
import { nameRejectMessage } from '$lib/text/field-error';
import { normalizeName } from '$lib/text/normalize';
import { isPaletteColor } from './palette';

export const PROJECT_NAME_MAX = 80;
export const PROJECT_CODE_MAX = 8;
export const PROJECT_CODE_PATTERN = /^[A-Z0-9-]{1,8}$/;

export interface ProjectFieldValues {
	name: string;
	color: string;
	/** Raw code from form; empty string means no code */
	code: string;
}

export interface NormalizedProjectFields {
	name: string;
	color: string;
	code?: string;
}

function hasNonAscii(value: string): boolean {
	for (const char of value) {
		const cp = char.codePointAt(0)!;
		if (cp > 0x7f) return true;
	}
	return false;
}

export function normalizeCode(raw: string | undefined | null): string | undefined {
	if (raw == null) return undefined;
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	// Uppercase only ASCII. `ı`.toUpperCase() is `I`, which would sneak past the pattern.
	if (hasNonAscii(trimmed)) return trimmed;
	return trimmed.toUpperCase();
}

/** Normalized name when it passes; otherwise trimmed raw so validation can still report why. */
export function resolvedProjectName(raw: string): string {
	const result = normalizeName(raw, { min: 1, max: PROJECT_NAME_MAX });
	return result.ok ? result.value : raw.trim();
}

export function normalizeProjectFields(input: ProjectFieldValues): NormalizedProjectFields {
	const name = resolvedProjectName(input.name);
	const code = normalizeCode(input.code);
	return {
		name,
		color: input.color,
		...(code ? { code } : {})
	};
}

/**
 * Validate create/update field values (not uniqueness — that needs the repository).
 * Returns localized error message or null if valid.
 */
export type ProjectFieldErrorKey = 'name' | 'code' | 'color' | 'progress';

export function parseProgressPercent(raw: string): number | null | 'invalid' {
	const t = raw.trim();
	if (!t) return null;
	if (!/^\d+$/.test(t)) return 'invalid';
	const n = Number(t);
	if (n < 0 || n > 100) return 'invalid';
	return n;
}

export function validateProjectFieldErrors(
	input: ProjectFieldValues & { progress?: string }
): Partial<Record<ProjectFieldErrorKey, string>> {
	const errors: Partial<Record<ProjectFieldErrorKey, string>> = {};
	const name = normalizeName(input.name, { min: 1, max: PROJECT_NAME_MAX });
	if (!name.ok) errors.name = nameRejectMessage(name.reason, PROJECT_NAME_MAX);

	if (!isPaletteColor(input.color)) errors.color = m.validation_color_palette();

	const code = normalizeCode(input.code);
	if (code != null) {
		const hasLetterOrDigit = /[A-Z0-9]/.test(code);
		if (code.length > PROJECT_CODE_MAX) {
			errors.code = m.validation_code_max({ max: PROJECT_CODE_MAX });
		} else if (hasNonAscii(code) || !hasLetterOrDigit || !PROJECT_CODE_PATTERN.test(code)) {
			errors.code = m.validation_code_chars();
		}
	}

	if (input.progress != null && parseProgressPercent(input.progress) === 'invalid') {
		errors.progress = m.validation_progress_range();
	}

	return errors;
}

export function validateProjectFields(input: ProjectFieldValues): string | null {
	const errors = validateProjectFieldErrors(input);
	return errors.name ?? errors.color ?? errors.code ?? null;
}
