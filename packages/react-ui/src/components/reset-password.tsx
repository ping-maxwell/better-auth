import type {
	AuthFlowState,
	ResetPasswordConfig,
	ResetPasswordFormData,
} from "@better-auth/ui-core";
import {
	buildResetPasswordBody,
	createInitialResetPasswordState,
	createResetPasswordFormData,
	mergeTheme,
	processResetPasswordResponse,
	resolveLabels,
	toAuthUIError,
	validateResetPasswordForm,
} from "@better-auth/ui-core";
import { useCallback, useMemo, useState } from "react";
import { useAuthUI } from "../hooks/use-auth-ui";
import { FormField } from "../internal/form-field";

/**
 * Reset password form -- sets a new password using a token from the reset email.
 *
 * @example
 * ```tsx
 * <ResetPassword token={searchParams.token} />
 * ```
 */
export function ResetPassword(props: ResetPasswordConfig) {
	const ctx = useAuthUI();
	const theme = props.theme
		? mergeTheme({ ...ctx.theme, ...props.theme })
		: ctx.theme;
	const allLabels = props.labels
		? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
		: ctx.labels;
	const labels = allLabels.resetPassword;
	const client = ctx.client;

	const { redirectUrl, onSuccess, onError } = props;

	const token = useMemo(() => {
		if (props.token) return props.token;
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			return params.get("token") ?? undefined;
		}
		return undefined;
	}, [props.token]);

	const [formData, setFormData] = useState<ResetPasswordFormData>(
		createResetPasswordFormData,
	);
	const [flowState, setFlowState] = useState<AuthFlowState>(
		createInitialResetPasswordState,
	);
	const [fieldError, setFieldError] = useState("");

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setFieldError("");

			if (!token) {
				setFieldError(
					"Missing reset token. Please use the link from your email.",
				);
				return;
			}

			const validationError = validateResetPasswordForm(formData);
			if (validationError) {
				setFieldError(validationError);
				return;
			}

			setFlowState({ step: "submitting", error: null });

			try {
				const fn = client.resetPassword as
					| ((
							body: Record<string, unknown>,
							opts?: Record<string, unknown>,
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

				const body = buildResetPasswordBody(formData, token);
				const res = await fn(body);
				const newState = processResetPasswordResponse(res);
				setFlowState(newState);

				if (newState.step === "error" && newState.error) {
					setFieldError(newState.error.message);
					onError?.(newState.error);
				} else if (newState.step === "success") {
					onSuccess?.(res.data);
					if (redirectUrl && typeof window !== "undefined") {
						window.location.href = redirectUrl;
					}
				}
			} catch (err) {
				const uiErr = toAuthUIError(err);
				setFlowState({ step: "error", error: uiErr });
				setFieldError(uiErr.message);
				onError?.(uiErr);
			}
		},
		[formData, token, client, redirectUrl, onSuccess, onError],
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
					<a href={redirectUrl ?? "/sign-in"} className={theme.link}>
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
			</div>

			<form onSubmit={handleSubmit}>
				<div className={theme.cardContent}>
					<FormField
						label={labels.password}
						error=""
						theme={theme}
						inputProps={{
							name: "password",
							type: "password",
							autoComplete: "new-password",
							value: formData.password,
							onChange: (e) =>
								setFormData((prev) => ({
									...prev,
									password: e.target.value,
								})),
						}}
					/>

					<FormField
						label={labels.confirmPassword}
						error=""
						theme={theme}
						inputProps={{
							name: "confirmPassword",
							type: "password",
							autoComplete: "new-password",
							value: formData.confirmPassword,
							onChange: (e) =>
								setFormData((prev) => ({
									...prev,
									confirmPassword: e.target.value,
								})),
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
		</div>
	);
}
