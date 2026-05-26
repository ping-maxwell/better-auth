import type { AuthFlowState } from "../types";
import { validateConfirmPassword, validatePassword } from "../validation";

export interface ResetPasswordFormData {
	password: string;
	confirmPassword: string;
}

export function createResetPasswordFormData(): ResetPasswordFormData {
	return { password: "", confirmPassword: "" };
}

export function createInitialResetPasswordState(): AuthFlowState {
	return { step: "idle", error: null };
}

export function validateResetPasswordForm(
	data: ResetPasswordFormData,
	options?: { minPasswordLength?: number; maxPasswordLength?: number },
): string | null {
	const passwordResult = validatePassword(data.password, {
		minLength: options?.minPasswordLength,
		maxLength: options?.maxPasswordLength,
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

export function processResetPasswordResponse(response: {
	data?: unknown;
	error?: unknown;
}): AuthFlowState {
	if (response.error) {
		const err = response.error as Record<string, unknown>;
		return {
			step: "error",
			error: {
				code: (err.code as string) ?? undefined,
				message: (err.message as string) ?? "Failed to reset password.",
				status: (err.status as number) ?? undefined,
			},
		};
	}
	return { step: "success", error: null };
}

export function buildResetPasswordBody(
	data: ResetPasswordFormData,
	token?: string,
): Record<string, unknown> {
	const body: Record<string, unknown> = { newPassword: data.password };
	if (token) body.token = token;
	return body;
}
