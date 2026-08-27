import { m } from '$lib/paraglide/messages.js';

export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MAX = 80;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegisterFieldValues = {
	email: string;
	password: string;
	confirm: string;
	displayName: string;
};

export type RegisterFieldErrorKey = 'email' | 'password' | 'confirm' | 'displayName' | 'code';

export type ResetFieldErrorKey = 'email' | 'password' | 'confirm' | 'code';

export function isValidOTP(raw: string): boolean {
	return /^\d{6}$/.test(raw.trim());
}

export function isValidRegisterCode(raw: string): boolean {
	return isValidOTP(raw);
}

export function normalizeEmail(raw: string): string {
	return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
	const email = normalizeEmail(raw);
	if (email.length < 3 || email.length > EMAIL_MAX) return false;
	return EMAIL_PATTERN.test(email);
}

export function passwordsMatch(password: string, confirm: string): boolean {
	return password.length > 0 && password === confirm;
}

export function validateRegisterFieldErrors(
	input: RegisterFieldValues
): Partial<Record<RegisterFieldErrorKey, string>> {
	const errors: Partial<Record<RegisterFieldErrorKey, string>> = {};
	const email = normalizeEmail(input.email);

	if (!email) errors.email = m.login_email_required();
	else if (!isValidEmail(email)) errors.email = m.register_email_format();

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

export function validateResetFieldErrors(input: {
	email: string;
	password: string;
	confirm: string;
}): Partial<Record<ResetFieldErrorKey, string>> {
	const errors: Partial<Record<ResetFieldErrorKey, string>> = {};
	const email = normalizeEmail(input.email);

	if (!email) errors.email = m.login_email_required();
	else if (!isValidEmail(email)) errors.email = m.register_email_format();

	if (!input.password) errors.password = m.login_password_required();
	else if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
		errors.password = m.register_password_length();
	}

	if (!input.confirm) errors.confirm = m.register_confirm_required();
	else if (input.password !== input.confirm) errors.confirm = m.register_password_mismatch();

	return errors;
}
