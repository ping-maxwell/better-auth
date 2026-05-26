import type { AuthFlowState, AuthUIError } from "../types";
import {
	validateEmail,
	validateOtp,
	validatePassword,
	validateUsername,
} from "../validation";

export interface SignInFormData {
	email: string;
	password: string;
	username: string;
	rememberMe: boolean;
	otpCode: string;
}

export function createSignInFormData(): SignInFormData {
	return {
		email: "",
		password: "",
		username: "",
		rememberMe: true,
		otpCode: "",
	};
}

export function createInitialSignInState(): AuthFlowState {
	return { step: "idle", error: null };
}

/**
 * Validate the sign-in form before submitting.
 * Returns an error message or null if valid.
 */
export function validateSignInForm(
	data: SignInFormData,
	mode: "email" | "username",
): string | null {
	if (mode === "email") {
		const emailResult = validateEmail(data.email);
		if (!emailResult.valid) return emailResult.message ?? "Invalid email.";
	} else {
		const usernameResult = validateUsername(data.username);
		if (!usernameResult.valid)
			return usernameResult.message ?? "Invalid username.";
	}
	const passwordResult = validatePassword(data.password, { minLength: 1 });
	if (!passwordResult.valid)
		return passwordResult.message ?? "Invalid password.";
	return null;
}

/**
 * Validate a two-factor verification code.
 */
export function validateTwoFactorCode(
	code: string,
	method: "totp" | "otp" | "backup",
): string | null {
	if (method === "backup") {
		if (!code.trim()) return "Backup code is required.";
		return null;
	}
	const result = validateOtp(code, 6);
	if (!result.valid) return result.message ?? "Invalid code.";
	return null;
}

/**
 * Process the response from a sign-in attempt.
 * Detects 2FA redirect and error states.
 */
export function processSignInResponse(
	response: { data?: unknown; error?: unknown },
	currentState: AuthFlowState,
): AuthFlowState {
	if (response.error) {
		const err = response.error as Record<string, unknown>;
		return {
			step: "error",
			error: {
				code: (err.code as string) ?? undefined,
				message: (err.message as string) ?? "Sign in failed.",
				status: (err.status as number) ?? undefined,
			},
		};
	}

	const data = response.data as Record<string, unknown> | undefined;
	if (data?.twoFactorRedirect) {
		return {
			step: "two-factor",
			error: null,
			twoFactorMethods: (data.twoFactorMethods as string[]) ?? [],
		};
	}

	return { step: "success", error: null };
}

/**
 * Build the request body for email sign-in.
 */
export function buildEmailSignInBody(
	data: SignInFormData,
	redirectUrl?: string,
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		email: data.email,
		password: data.password,
		rememberMe: data.rememberMe,
	};
	if (redirectUrl) body.callbackURL = redirectUrl;
	return body;
}

/**
 * Build the request body for username sign-in.
 */
export function buildUsernameSignInBody(
	data: SignInFormData,
	redirectUrl?: string,
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		username: data.username,
		password: data.password,
		rememberMe: data.rememberMe,
	};
	if (redirectUrl) body.callbackURL = redirectUrl;
	return body;
}

/**
 * Normalize a client error into AuthUIError.
 */
export function toAuthUIError(err: unknown): AuthUIError {
	if (err && typeof err === "object" && "message" in err) {
		const e = err as Record<string, unknown>;
		return {
			code: (e.code as string) ?? undefined,
			message: (e.message as string) ?? "An unexpected error occurred.",
			status: (e.status as number) ?? undefined,
		};
	}
	return { message: "An unexpected error occurred." };
}
