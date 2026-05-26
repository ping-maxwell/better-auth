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
import { createSignal, Show } from "solid-js";
import { FormField } from "../internal/form-field";
import { useAuthUI } from "../provider";

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
	const theme = () =>
		props.theme ? mergeTheme({ ...ctx.theme, ...props.theme }) : ctx.theme;
	const allLabels = () =>
		props.labels
			? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
			: ctx.labels;
	const labels = () => allLabels().forgotPassword;

	const signInUrl = () => props.signInUrl ?? "/sign-in";

	const [formData, setFormData] = createSignal<ForgotPasswordFormData>(
		createForgotPasswordFormData(),
	);
	const [flowState, setFlowState] = createSignal<AuthFlowState>(
		createInitialForgotPasswordState(),
	);
	const [fieldError, setFieldError] = createSignal("");

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		setFieldError("");

		const validationError = validateForgotPasswordForm(formData());
		if (validationError) {
			setFieldError(validationError);
			return;
		}

		setFlowState({ step: "submitting", error: null });

		try {
			const fn = ctx.client.requestPasswordReset as
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

			const body = buildForgotPasswordBody(formData(), props.redirectUrl);
			const res = await fn(body);
			const newState = processForgotPasswordResponse(res);
			setFlowState(newState);

			if (newState.step === "error" && newState.error) {
				setFieldError(newState.error.message);
				props.onError?.(newState.error);
			} else if (newState.step === "success") {
				props.onSuccess?.(res.data);
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
						<a href={signInUrl()} class={theme().link}>
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
					<p class={theme().cardDescription}>{labels().description}</p>
				</div>

				<form onSubmit={handleSubmit}>
					<div class={theme().cardContent}>
						<FormField
							label={labels().email}
							error=""
							theme={theme()}
							inputProps={{
								name: "email",
								type: "email",
								autocomplete: "email",
								value: formData().email,
								onInput: (e) =>
									setFormData((prev) => ({
										...prev,
										email: e.currentTarget.value,
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

				<div class={theme().cardFooter}>
					<a href={signInUrl()} class={theme().link}>
						{labels().backToSignIn}
					</a>
				</div>
			</div>
		</Show>
	);
}
