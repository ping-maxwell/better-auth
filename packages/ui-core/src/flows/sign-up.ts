import type { AuthFlowState } from "../types";
import {
	validateConfirmPassword,
	validateEmail,
	validateName,
	validatePassword,
	validateUsername,
} from "../validation";

export interface SignUpFormData {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
	username: string;
}

export function createSignUpFormData(): SignUpFormData {
	return {
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		username: "",
	};
}

export function createInitialSignUpState(): AuthFlowState {
	return { step: "idle", error: null };
}

export function validateSignUpForm(
	data: SignUpFormData,
	options: {
		showName?: boolean;
		showUsername?: boolean;
		minPasswordLength?: number;
		maxPasswordLength?: number;
	} = {},
): string | null {
	const { showName = true, showUsername = false } = options;

	if (showName) {
		const nameResult = validateName(data.name);
		if (!nameResult.valid) return nameResult.message ?? "Invalid name.";
	}

	const emailResult = validateEmail(data.email);
	if (!emailResult.valid) return emailResult.message ?? "Invalid email.";

	if (showUsername) {
		const usernameResult = validateUsername(data.username);
		if (!usernameResult.valid)
			return usernameResult.message ?? "Invalid username.";
	}

	const passwordResult = validatePassword(data.password, {
		minLength: options.minPasswordLength,
		maxLength: options.maxPasswordLength,
	});
	if (!passwordResult.valid)
		return passwordResult.message ?? "Invalid password.";

	const confirmResult = validateConfirmPassword(
		data.password,
		data.confirmPassword,
	);
	if (!confirmResult.valid) return confirmResult.message ?? "Passwords differ.";

	return null;
}

export function processSignUpResponse(response: {
	data?: unknown;
	error?: unknown;
}): AuthFlowState {
	if (response.error) {
		const err = response.error as Record<string, unknown>;
		return {
			step: "error",
			error: {
				code: (err.code as string) ?? undefined,
				message: (err.message as string) ?? "Sign up failed.",
				status: (err.status as number) ?? undefined,
			},
		};
	}
	return { step: "success", error: null };
}

export function buildSignUpBody(
	data: SignUpFormData,
	options: {
		showName?: boolean;
		showUsername?: boolean;
		redirectUrl?: string;
	} = {},
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		email: data.email,
		password: data.password,
	};
	if (options.showName !== false && data.name) body.name = data.name;
	if (options.showUsername && data.username) body.username = data.username;
	if (options.redirectUrl) body.callbackURL = options.redirectUrl;
	return body;
}
