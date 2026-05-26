/**
 * Lightweight validation helpers.
 * Framework packages call these to validate form fields before submission.
 * No zod dependency -- keeps the bundle small for client-side usage.
 */

export interface ValidationResult {
	valid: boolean;
	message?: string | undefined;
}

const EMAIL_RE =
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(value: string): ValidationResult {
	if (!value) return { valid: false, message: "Email is required." };
	if (!EMAIL_RE.test(value))
		return { valid: false, message: "Please enter a valid email address." };
	return { valid: true };
}

export function validatePassword(
	value: string,
	options?: { minLength?: number; maxLength?: number },
): ValidationResult {
	const min = options?.minLength ?? 8;
	const max = options?.maxLength ?? 128;

	if (!value) return { valid: false, message: "Password is required." };
	if (value.length < min)
		return {
			valid: false,
			message: `Password must be at least ${min} characters.`,
		};
	if (value.length > max)
		return {
			valid: false,
			message: `Password must be at most ${max} characters.`,
		};
	return { valid: true };
}

export function validateConfirmPassword(
	password: string,
	confirm: string,
): ValidationResult {
	if (!confirm)
		return { valid: false, message: "Please confirm your password." };
	if (password !== confirm)
		return { valid: false, message: "Passwords do not match." };
	return { valid: true };
}

export function validateUsername(
	value: string,
	options?: {
		minLength?: number;
		maxLength?: number;
		pattern?: RegExp;
	},
): ValidationResult {
	const min = options?.minLength ?? 3;
	const max = options?.maxLength ?? 30;
	const pattern = options?.pattern ?? /^[a-zA-Z0-9_.]+$/;

	if (!value) return { valid: false, message: "Username is required." };
	if (value.length < min)
		return {
			valid: false,
			message: `Username must be at least ${min} characters.`,
		};
	if (value.length > max)
		return {
			valid: false,
			message: `Username must be at most ${max} characters.`,
		};
	if (!pattern.test(value))
		return {
			valid: false,
			message:
				"Username may only contain letters, numbers, underscores, and periods.",
		};
	return { valid: true };
}

export function validateName(value: string): ValidationResult {
	if (!value.trim()) return { valid: false, message: "Name is required." };
	return { valid: true };
}

const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;

export function validatePhoneNumber(value: string): ValidationResult {
	if (!value) return { valid: false, message: "Phone number is required." };
	if (!PHONE_RE.test(value))
		return {
			valid: false,
			message: "Please enter a valid phone number.",
		};
	return { valid: true };
}

export function validateOtp(
	value: string,
	length: number = 6,
): ValidationResult {
	if (!value) return { valid: false, message: "Code is required." };
	if (value.length !== length)
		return { valid: false, message: `Code must be ${length} digits.` };
	if (!/^\d+$/.test(value))
		return { valid: false, message: "Code must contain only digits." };
	return { valid: true };
}

export function validateRequired(
	value: string,
	fieldName: string = "This field",
): ValidationResult {
	if (!value.trim())
		return { valid: false, message: `${fieldName} is required.` };
	return { valid: true };
}
