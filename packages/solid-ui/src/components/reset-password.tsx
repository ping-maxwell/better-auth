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
import { createMemo, createSignal, Show } from "solid-js";
import { FormField } from "../internal/form-field";
import { useAuthUI } from "../provider";

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
	const theme = () =>
		props.theme ? mergeTheme({ ...ctx.theme, ...props.theme }) : ctx.theme;
	const allLabels = () =>
		props.labels
			? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
			: ctx.labels;
	const labels = () => allLabels().resetPassword;

	const token = createMemo(() => {
		if (props.token) return props.token;
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			return params.get("token") ?? undefined;
		}
		return undefined;
	});

	const [formData, setFormData] = createSignal<ResetPasswordFormData>(
		createResetPasswordFormData(),
	);
	const [flowState, setFlowState] = createSignal<AuthFlowState>(
		createInitialResetPasswordState(),
	);
	const [fieldError, setFieldError] = createSignal("");

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		setFieldError("");

		if (!token()) {
			setFieldError(
				"Missing reset token. Please use the link from your email.",
			);
			return;
		}

		const validationError = validateResetPasswordForm(formData());
		if (validationError) {
			setFieldError(validationError);
			return;
		}

		setFlowState({ step: "submitting", error: null });

		try {
			const fn = ctx.client.resetPassword as
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

			const body = buildResetPasswordBody(formData(), token()!);
			const res = await fn(body);
			const newState = processResetPasswordResponse(res);
			setFlowState(newState);

			if (newState.step === "error" && newState.error) {
				setFieldError(newState.error.message);
				props.onError?.(newState.error);
			} else if (newState.step === "success") {
				props.onSuccess?.(res.data);
				if (props.redirectUrl && typeof window !== "undefined") {
					window.location.href = props.redirectUrl;
				}
			}
		} catch (err) {
			const uiErr = toAuthUIError(err);
			setFlowState({ step: "error", error: uiErr });
			setFieldError(uiErr.message);
			props.onError?.(uiErr);
		}
	};

	return (
		<Show
			when={flowState().step !== "success"}
			fallback={
				<div
					class={`${theme().card}${props.className ? ` ${props.className}` : ""}`}
					style={props.style}
				>
					<div class={theme().cardHeader}>
						<h2 class={theme().cardTitle}>{labels().title}</h2>
						<p class={theme().cardDescription}>{labels().successMessage}</p>
					</div>
					<div class={theme().cardFooter}>
						<a href={props.redirectUrl ?? "/sign-in"} class={theme().link}>
							{labels().backToSignIn}
						</a>
					</div>
				</div>
			}
		>
			<div
				class={`${theme().card}${props.className ? ` ${props.className}` : ""}`}
				style={props.style}
			>
				<div class={theme().cardHeader}>
					<h2 class={theme().cardTitle}>{labels().title}</h2>
				</div>

				<form onSubmit={handleSubmit}>
					<div class={theme().cardContent}>
						<FormField
							label={labels().password}
							error=""
							theme={theme()}
							inputProps={{
								name: "password",
								type: "password",
								autocomplete: "new-password",
								value: formData().password,
								onInput: (e) =>
									setFormData((prev) => ({
										...prev,
										password: e.currentTarget.value,
									})),
							}}
						/>

						<FormField
							label={labels().confirmPassword}
							error=""
							theme={theme()}
							inputProps={{
								name: "confirmPassword",
								type: "password",
								autocomplete: "new-password",
								value: formData().confirmPassword,
								onInput: (e) =>
									setFormData((prev) => ({
										...prev,
										confirmPassword: e.currentTarget.value,
									})),
							}}
						/>

						<Show when={fieldError()}>
							<p class={theme().error}>{fieldError()}</p>
						</Show>

						<button
							type="submit"
							class={theme().button.primary}
							disabled={flowState().step === "submitting"}
						>
							{flowState().step === "submitting"
								? labels().submitting
								: labels().submit}
						</button>
					</div>
				</form>
			</div>
		</Show>
	);
}
