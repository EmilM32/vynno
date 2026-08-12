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
 * Returns error message or null if valid.
 */
export function validateProjectFields(input: ProjectFieldValues): string | null {
	const name = input.name.trim();
	if (!name) return 'Name is required.';
	if (name.length > PROJECT_NAME_MAX) return `Name must be at most ${PROJECT_NAME_MAX} characters.`;

	if (!isPaletteColor(input.color)) return 'Choose a color from the palette.';

	const code = normalizeCode(input.code);
	if (code != null) {
		if (code.length > PROJECT_CODE_MAX) {
			return `Code must be at most ${PROJECT_CODE_MAX} characters.`;
		}
		if (!PROJECT_CODE_PATTERN.test(code)) {
			return 'Code may only contain A–Z, 0–9, and hyphens.';
		}
	}

	return null;
}
