import type {
	AuthFlowState,
	SignUpConfig,
	SignUpFormData,
} from "@better-auth/ui-core";
import {
	buildSignUpBody,
	createInitialSignUpState,
	createSignUpFormData,
	mergeTheme,
	processSignUpResponse,
	resolveLabels,
	toAuthUIError,
	validateSignUpForm,
} from "@better-auth/ui-core";
import { createSignal, Show } from "solid-js";
import { Divider } from "../internal/divider";
import { FormField } from "../internal/form-field";
import { SocialButtons } from "../internal/social-buttons";
import { useAuthUI } from "../provider";

/**
 * Pre-built sign-up form component.
 *
 * @example
 * ```tsx
 * <SignUp
 *   emailAndPassword
 *   username
 *   oauth={["github", "google"]}
 *   redirectUrl="/dashboard"
 * />
 * ```
 */
export function SignUp(props: SignUpConfig) {
	const ctx = useAuthUI();
	const theme = () =>
		props.theme ? mergeTheme({ ...ctx.theme, ...props.theme }) : ctx.theme;
	const allLabels = () =>
		props.labels
			? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
			: ctx.labels;
	const labels = () => allLabels().signUp;

	const emailAndPassword = () => props.emailAndPassword ?? true;
	const showUsername = () => props.username ?? false;
	const showName = () => props.name ?? true;
	const signInUrl = () => props.signInUrl ?? "/sign-in";

	const [formData, setFormData] = createSignal<SignUpFormData>(
		createSignUpFormData(),
	);
	const [flowState, setFlowState] = createSignal<AuthFlowState>(
		createInitialSignUpState(),
	);
	const [fieldError, setFieldError] = createSignal("");

	const updateField = <K extends keyof SignUpFormData>(
		field: K,
		value: SignUpFormData[K],
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		setFieldError("");

		const validationError = validateSignUpForm(formData(), {
			showName: showName(),
			showUsername: showUsername(),
		});
		if (validationError) {
			setFieldError(validationError);
			return;
		}

		setFlowState({ step: "submitting", error: null });

		try {
			const signUp = ctx.client.signUp as Record<
				string,
				(
					args: Record<string, unknown>,
				) => Promise<{ data?: unknown; error?: unknown }>
			>;
			const fn = signUp?.email;
			if (!fn) {
				setFieldError("Sign-up is not configured.");
				setFlowState({
					step: "error",
					error: { message: "Sign-up is not configured." },
				});
				return;
			}

			const body = buildSignUpBody(formData(), {
				showName: showName(),
				showUsername: showUsername(),
				redirectUrl: props.redirectUrl,
			});
			const res = await fn(body);
			const newState = processSignUpResponse(res);
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

	const showDivider = () =>
		emailAndPassword() &&
		props.oauth &&
		Array.isArray(props.oauth) &&
		props.oauth.length > 0;

	return (
		<div
			class={`${theme().card}${props.className ? ` ${props.className}` : ""}`}
			style={props.style}
		>
			<div class={theme().cardHeader}>
				<h2 class={theme().cardTitle}>{labels().title}</h2>
			</div>

			<div class={theme().cardContent}>
				<Show
					when={
						props.oauth && Array.isArray(props.oauth) && props.oauth.length > 0
					}
				>
					<SocialButtons
						providers={props.oauth as string[]}
						theme={theme()}
						redirectUrl={props.redirectUrl}
						onError={(err) => props.onError?.(toAuthUIError(err))}
						client={ctx.client}
					/>
				</Show>

				<Show when={showDivider()}>
					<Divider text={labels().orContinueWith} theme={theme()} />
				</Show>

				<Show when={emailAndPassword()}>
					<form onSubmit={handleSubmit}>
						<div class={theme().cardContent}>
							<Show when={showName()}>
								<FormField
									label={labels().name}
									error=""
									theme={theme()}
									inputProps={{
										name: "name",
										type: "text",
										autocomplete: "name",
										value: formData().name,
										onInput: (e) => updateField("name", e.currentTarget.value),
									}}
								/>
							</Show>

							<FormField
								label={labels().email}
								error=""
								theme={theme()}
								inputProps={{
									name: "email",
									type: "email",
									autocomplete: "email",
									value: formData().email,
									onInput: (e) => updateField("email", e.currentTarget.value),
								}}
							/>

							<Show when={showUsername()}>
								<FormField
									label={labels().username}
									error=""
									theme={theme()}
									inputProps={{
										name: "username",
										type: "text",
										autocomplete: "username",
										value: formData().username,
										onInput: (e) =>
											updateField("username", e.currentTarget.value),
									}}
								/>
							</Show>

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
										updateField("password", e.currentTarget.value),
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
										updateField("confirmPassword", e.currentTarget.value),
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
				</Show>
			</div>

			<div class={theme().cardFooter}>
				<span>{labels().hasAccount} </span>
				<a href={signInUrl()} class={theme().link}>
					{labels().signIn}
				</a>
			</div>
		</div>
	);
}
