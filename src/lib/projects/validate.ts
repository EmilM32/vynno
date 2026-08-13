import { m } from '$lib/paraglide/messages.js';
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

export function normalizeCode(raw: string | undefined | null): string | undefined {
	if (raw == null) return undefined;
	const code = raw.trim().toUpperCase();
	return code.length > 0 ? code : undefined;
}

export function normalizeProjectFields(input: ProjectFieldValues): NormalizedProjectFields {
	const name = input.name.trim();
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
export type ProjectFieldErrorKey = 'name' | 'code' | 'color';

export function validateProjectFieldErrors(
	input: ProjectFieldValues
): Partial<Record<ProjectFieldErrorKey, string>> {
	const errors: Partial<Record<ProjectFieldErrorKey, string>> = {};
	const name = input.name.trim();
	if (!name) errors.name = m.validation_name_required();
	else if (name.length > PROJECT_NAME_MAX) {
		errors.name = m.validation_name_max({ max: PROJECT_NAME_MAX });
	}

	if (!isPaletteColor(input.color)) errors.color = m.validation_color_palette();

	const code = normalizeCode(input.code);
	if (code != null) {
		if (code.length > PROJECT_CODE_MAX) {
			errors.code = m.validation_code_max({ max: PROJECT_CODE_MAX });
		} else if (!PROJECT_CODE_PATTERN.test(code)) {
			errors.code = m.validation_code_chars();
		}
	}

	return errors;
}

export function validateProjectFields(input: ProjectFieldValues): string | null {
	const errors = validateProjectFieldErrors(input);
	return errors.name ?? errors.color ?? errors.code ?? null;
}
