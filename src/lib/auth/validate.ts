import { m } from '$lib/paraglide/messages.js';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MAX = 80;

export type RegisterFieldValues = {
	username: string;
	password: string;
	confirm: string;
	displayName: string;
};

export type RegisterFieldErrorKey = 'username' | 'password' | 'confirm' | 'displayName';

export function normalizeUsername(raw: string): string {
	return raw.trim().toLowerCase();
}

export function passwordsMatch(password: string, confirm: string): boolean {
	return password.length > 0 && password === confirm;
}

export function validateRegisterFieldErrors(
	input: RegisterFieldValues
): Partial<Record<RegisterFieldErrorKey, string>> {
	const errors: Partial<Record<RegisterFieldErrorKey, string>> = {};
	const username = normalizeUsername(input.username);

	if (!username) errors.username = m.login_username_required();
	else if (!USERNAME_PATTERN.test(username)) errors.username = m.register_username_format();

	if (!input.password) errors.password = m.login_password_required();
	else if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
		errors.password = m.register_password_length();
	}

	if (!input.confirm) errors.confirm = m.register_confirm_required();
	else if (input.password !== input.confirm) errors.confirm = m.register_password_mismatch();

	const displayName = input.displayName.trim();
	if (displayName.length > DISPLAY_NAME_MAX) {
		errors.displayName = m.register_display_name_max({ max: DISPLAY_NAME_MAX });
	}

	return errors;
}
