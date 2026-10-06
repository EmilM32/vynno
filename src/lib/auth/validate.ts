import { m } from '$lib/paraglide/messages.js';
import { nameRejectMessage } from '$lib/text/field-error';
import { normalizeName } from '$lib/text/normalize';

export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
/** bcrypt's input limit; the API rejects longer passwords. */
export const PASSWORD_MAX_BYTES = 72;
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

export type PasswordReject = 'length' | 'bytes';

/** API rule: 8–128 code points and at most 72 bytes of UTF-8. */
export function checkPassword(raw: string): PasswordReject | null {
	const n = [...raw].length;
	if (n < PASSWORD_MIN || n > PASSWORD_MAX) return 'length';
	if (new TextEncoder().encode(raw).length > PASSWORD_MAX_BYTES) return 'bytes';
	return null;
}

export function passwordFieldError(raw: string): string | undefined {
	if (!raw) return m.login_password_required();
	const reject = checkPassword(raw);
	if (reject === 'length') return m.register_password_length();
	if (reject === 'bytes') return m.register_password_bytes();
	return undefined;
}

export function validateRegisterFieldErrors(
	input: RegisterFieldValues
): Partial<Record<RegisterFieldErrorKey, string>> {
	const errors: Partial<Record<RegisterFieldErrorKey, string>> = {};
	const email = normalizeEmail(input.email);

	if (!email) errors.email = m.login_email_required();
	else if (!isValidEmail(email)) errors.email = m.register_email_format();

	const password = passwordFieldError(input.password);
	if (password) errors.password = password;

	if (!input.confirm) errors.confirm = m.register_confirm_required();
	else if (input.password !== input.confirm) errors.confirm = m.register_password_mismatch();

	const displayName = normalizeName(input.displayName, { min: 0, max: DISPLAY_NAME_MAX });
	if (!displayName.ok) {
		errors.displayName =
			displayName.reason === 'too_long'
				? m.register_display_name_max({ max: DISPLAY_NAME_MAX })
				: nameRejectMessage(displayName.reason, DISPLAY_NAME_MAX);
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

	const password = passwordFieldError(input.password);
	if (password) errors.password = password;

	if (!input.confirm) errors.confirm = m.register_confirm_required();
	else if (input.password !== input.confirm) errors.confirm = m.register_password_mismatch();

	return errors;
}
