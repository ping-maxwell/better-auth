import type {
	AuthFlowState,
	ForgotPasswordConfig,
	ForgotPasswordFormData,
} from "@better-auth/ui-core";
import {
	buildForgotPasswordBody,
	createForgotPasswordFormData,
	createInitialForgotPasswordState,
	mergeTheme,
	processForgotPasswordResponse,
	resolveLabels,
	toAuthUIError,
	validateForgotPasswordForm,
} from "@better-auth/ui-core";
import { useCallback, useState } from "react";
import { useAuthUI } from "../hooks/use-auth-ui";
import { FormField } from "../internal/form-field";

/**
 * Forgot password form -- sends a password reset email.
 *
 * @example
 * ```tsx
 * <ForgotPassword redirectUrl="/reset-password" />
 * ```
 */
export function ForgotPassword(props: ForgotPasswordConfig) {
	const ctx = useAuthUI();
	const theme = props.theme
		? mergeTheme({ ...ctx.theme, ...props.theme })
		: ctx.theme;
	const allLabels = props.labels
		? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
		: ctx.labels;
	const labels = allLabels.forgotPassword;
	const client = ctx.client;

	const { redirectUrl, signInUrl = "/sign-in", onSuccess, onError } = props;

	const [formData, setFormData] = useState<ForgotPasswordFormData>(
		createForgotPasswordFormData,
	);
	const [flowState, setFlowState] = useState<AuthFlowState>(
		createInitialForgotPasswordState,
	);
	const [fieldError, setFieldError] = useState("");

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setFieldError("");

			const validationError = validateForgotPasswordForm(formData);
			if (validationError) {
				setFieldError(validationError);
				return;
			}

			setFlowState({ step: "submitting", error: null });

			try {
				const fn = client.requestPasswordReset as
					| ((
							args: Record<string, unknown>,
					  ) => Promise<{ data?: unknown; error?: unknown }>)
					| undefined;

				if (!fn) {
					setFieldError("Password reset is not configured.");
					setFlowState({
						step: "error",
						error: { message: "Password reset is not configured." },
					});
					return;
				}

				const body = buildForgotPasswordBody(formData, redirectUrl);
				const res = await fn(body);
				const newState = processForgotPasswordResponse(res);
				setFlowState(newState);

				if (newState.step === "error" && newState.error) {
					setFieldError(newState.error.message);
					onError?.(newState.error);
				} else if (newState.step === "success") {
					onSuccess?.(res.data);
				}
			} catch (err) {
				const uiErr = toAuthUIError(err);
				setFlowState({ step: "error", error: uiErr });
				setFieldError(uiErr.message);
				onError?.(uiErr);
			}
		},
		[formData, client, redirectUrl, onSuccess, onError],
	);

	if (flowState.step === "success") {
		return (
			<div
				className={`${theme.card}${props.className ? ` ${props.className}` : ""}`}
				style={props.style}
			>
				<div className={theme.cardHeader}>
					<h2 className={theme.cardTitle}>{labels.title}</h2>
					<p className={theme.cardDescription}>{labels.successMessage}</p>
				</div>
				<div className={theme.cardFooter}>
					<a href={signInUrl} className={theme.link}>
						{labels.backToSignIn}
					</a>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`${theme.card}${props.className ? ` ${props.className}` : ""}`}
			style={props.style}
		>
			<div className={theme.cardHeader}>
				<h2 className={theme.cardTitle}>{labels.title}</h2>
				<p className={theme.cardDescription}>{labels.description}</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className={theme.cardContent}>
					<FormField
						label={labels.email}
						error=""
						theme={theme}
						inputProps={{
							name: "email",
							type: "email",
							autoComplete: "email",
							value: formData.email,
							onChange: (e) =>
								setFormData((prev) => ({ ...prev, email: e.target.value })),
						}}
					/>

					{fieldError && <p className={theme.error}>{fieldError}</p>}

					<button
						type="submit"
						className={theme.button.primary}
						disabled={flowState.step === "submitting"}
					>
						{flowState.step === "submitting"
							? labels.submitting
							: labels.submit}
					</button>
				</div>
			</form>

			<div className={theme.cardFooter}>
				<a href={signInUrl} className={theme.link}>
					{labels.backToSignIn}
				</a>
			</div>
		</div>
	);
}
