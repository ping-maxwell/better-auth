import type { AuthFlowState } from "../types";
import { validateEmail } from "../validation";

export interface ForgotPasswordFormData {
	email: string;
}

export function createForgotPasswordFormData(): ForgotPasswordFormData {
	return { email: "" };
}

export function createInitialForgotPasswordState(): AuthFlowState {
	return { step: "idle", error: null };
}

export function validateForgotPasswordForm(
	data: ForgotPasswordFormData,
): string | null {
	const emailResult = validateEmail(data.email);
	if (!emailResult.valid) return emailResult.message ?? "Invalid email.";
	return null;
}

export function processForgotPasswordResponse(response: {
	data?: unknown;
	error?: unknown;
}): AuthFlowState {
	if (response.error) {
		const err = response.error as Record<string, unknown>;
		return {
			step: "error",
			error: {
				code: (err.code as string) ?? undefined,
				message:
					(err.message as string) ?? "Failed to send password reset email.",
				status: (err.status as number) ?? undefined,
			},
		};
	}
	return { step: "success", error: null };
}

export function buildForgotPasswordBody(
	data: ForgotPasswordFormData,
	redirectUrl?: string,
): Record<string, unknown> {
	const body: Record<string, unknown> = { email: data.email };
	if (redirectUrl) body.redirectTo = redirectUrl;
	return body;
}
