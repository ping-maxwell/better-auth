import type {
	AuthFlowState,
	SignInConfig,
	SignInFormData,
} from "@better-auth/ui-core";
import {
	buildEmailSignInBody,
	buildUsernameSignInBody,
	createInitialSignInState,
	createSignInFormData,
	mergeTheme,
	processSignInResponse,
	resolveLabels,
	toAuthUIError,
	validateSignInForm,
} from "@better-auth/ui-core";
import { createSignal, Show } from "solid-js";
import { Divider } from "../internal/divider";
import { FormField } from "../internal/form-field";
import { SocialButtons } from "../internal/social-buttons";
import { TwoFactorStep } from "../internal/two-factor-step";
import { useAuthUI } from "../provider";

/**
 * Pre-built sign-in form component.
 *
 * @example
 * ```tsx
 * <SignIn
 *   emailAndPassword
 *   oauth={["github", "google"]}
 *   passkey
 *   twoFactor
 *   redirectUrl="/dashboard"
 * />
 * ```
 */
export function SignIn(props: SignInConfig) {
	const ctx = useAuthUI();
	const theme = () =>
		props.theme ? mergeTheme({ ...ctx.theme, ...props.theme }) : ctx.theme;
	const allLabels = () =>
		props.labels
			? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
			: ctx.labels;
	const labels = () => allLabels().signIn;

	const emailAndPassword = () => props.emailAndPassword ?? true;
	const username = () => props.username ?? false;
	const passkey = () => props.passkey ?? false;
	const twoFactor = () => props.twoFactor ?? false;
	const magicLink = () => props.magicLink ?? false;
	const _phoneNumber = () => props.phoneNumber ?? false;
	const emailOtp = () => props.emailOtp ?? false;
	const signUpUrl = () => props.signUpUrl ?? "/sign-up";
	const forgotPasswordUrl = () => props.forgotPasswordUrl ?? "/forgot-password";

	const [formData, setFormData] = createSignal<SignInFormData>(
		createSignInFormData(),
	);
	const [flowState, setFlowState] = createSignal<AuthFlowState>(
		createInitialSignInState(),
	);
	const [fieldError, setFieldError] = createSignal("");

	const updateField = <K extends keyof SignInFormData>(
		field: K,
		value: SignInFormData[K],
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleEmailSignIn = async (e: SubmitEvent) => {
		e.preventDefault();
		setFieldError("");

		const mode = username() ? "username" : "email";
		const validationError = validateSignInForm(formData(), mode);
		if (validationError) {
			setFieldError(validationError);
			return;
		}

		setFlowState({ step: "submitting", error: null });

		try {
			const signIn = ctx.client.signIn as Record<
				string,
				(
					args: Record<string, unknown>,
				) => Promise<{ data?: unknown; error?: unknown }>
			>;

			let res: { data?: unknown; error?: unknown };
			if (username()) {
				const fn = signIn.username;
				if (!fn) {
					setFieldError("Username sign-in is not configured.");
					setFlowState({
						step: "error",
						error: { message: "Username sign-in is not configured." },
					});
					return;
				}
				res = await fn(buildUsernameSignInBody(formData(), props.redirectUrl));
			} else {
				const fn = signIn.email;
				if (!fn) {
					setFieldError("Email sign-in is not configured.");
					setFlowState({
						step: "error",
						error: { message: "Email sign-in is not configured." },
					});
					return;
				}
				res = await fn(buildEmailSignInBody(formData(), props.redirectUrl));
			}

			const newState = processSignInResponse(res, flowState());
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

	const handlePasskeySignIn = async () => {
		try {
			const signIn = ctx.client.signIn as Record<
				string,
				(
					args?: Record<string, unknown>,
				) => Promise<{ data?: unknown; error?: unknown }>
			>;
			const fn = signIn.passkey;
			if (!fn) {
				console.error(
					"[better-auth/solid-ui] client.signIn.passkey is not available.",
				);
				return;
			}
			const res = await fn();
			if (res.error) {
				props.onError?.(toAuthUIError(res.error));
			} else {
				props.onSuccess?.(res.data);
			}
		} catch (err) {
			props.onError?.(toAuthUIError(err));
		}
	};

	const handleMagicLink = async () => {
		setFieldError("");
		if (!formData().email) {
			setFieldError("Please enter your email first.");
			return;
		}

		try {
			const signIn = ctx.client.signIn as Record<
				string,
				(
					args: Record<string, unknown>,
				) => Promise<{ data?: unknown; error?: unknown }>
			>;
			const fn = signIn.magicLink;
			if (!fn) {
				setFieldError("Magic link sign-in is not configured.");
				return;
			}
			const body: Record<string, unknown> = { email: formData().email };
			if (props.redirectUrl) body.callbackURL = props.redirectUrl;
			const res = await fn(body);
			if (res.error) {
				setFieldError(toAuthUIError(res.error).message);
			} else {
				setFlowState({ step: "success", error: null });
				setFieldError(labels().magicLinkSent);
			}
		} catch (err) {
			setFieldError(toAuthUIError(err).message);
		}
	};

	const handleEmailOtp = async () => {
		setFieldError("");
		if (!formData().email) {
			setFieldError("Please enter your email first.");
			return;
		}

		try {
			const emailOtpNs = ctx.client.emailOtp as
				| Record<
						string,
						(
							args: Record<string, unknown>,
						) => Promise<{ data?: unknown; error?: unknown }>
				  >
				| undefined;
			const fn = emailOtpNs?.sendVerificationOtp;
			if (!fn) {
				setFieldError("Email OTP is not configured.");
				return;
			}
			const res = await fn({ email: formData().email, type: "sign-in" });
			if (res.error) {
				setFieldError(toAuthUIError(res.error).message);
			} else {
				setFieldError(labels().emailOtpSent);
			}
		} catch (err) {
			setFieldError(toAuthUIError(err).message);
		}
	};

	const showDivider = () =>
		emailAndPassword() &&
		props.oauth &&
		Array.isArray(props.oauth) &&
		props.oauth.length > 0;

	return (
		<Show
			when={!(twoFactor() && flowState().step === "two-factor")}
			fallback={
				<div class={theme().card} style={props.style}>
					<TwoFactorStep
						methods={flowState().twoFactorMethods ?? []}
						theme={theme()}
						labels={allLabels().twoFactor}
						client={ctx.client}
						onSuccess={props.onSuccess}
						onError={props.onError}
					/>
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

				<div class={theme().cardContent}>
					<Show
						when={
							props.oauth &&
							Array.isArray(props.oauth) &&
							props.oauth.length > 0
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
						<form onSubmit={handleEmailSignIn}>
							<div class={theme().cardContent}>
								<Show
									when={!username()}
									fallback={
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
									}
								>
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
												updateField("email", e.currentTarget.value),
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
										autocomplete: "current-password",
										value: formData().password,
										onInput: (e) =>
											updateField("password", e.currentTarget.value),
									}}
								/>

								<Show when={fieldError()}>
									<p class={theme().error}>{fieldError()}</p>
								</Show>

								<div
									style={{
										display: "flex",
										"justify-content": "space-between",
										"align-items": "center",
									}}
								>
									<label
										style={{
											display: "flex",
											"align-items": "center",
											gap: "6px",
										}}
									>
										<input
											type="checkbox"
											checked={formData().rememberMe}
											onChange={(e) =>
												updateField("rememberMe", e.currentTarget.checked)
											}
										/>
										<span class={theme().label}>{labels().rememberMe}</span>
									</label>

									<Show when={forgotPasswordUrl()}>
										<a href={forgotPasswordUrl()} class={theme().button.link}>
											{labels().forgotPassword}
										</a>
									</Show>
								</div>

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

					<Show when={passkey()}>
						<button
							type="button"
							class={theme().button.social}
							onClick={handlePasskeySignIn}
						>
							{labels().passkey}
						</button>
					</Show>

					<Show when={magicLink()}>
						<button
							type="button"
							class={theme().button.social}
							onClick={handleMagicLink}
						>
							{labels().magicLink}
						</button>
					</Show>

					<Show when={emailOtp()}>
						<button
							type="button"
							class={theme().button.social}
							onClick={handleEmailOtp}
						>
							{labels().emailOtp}
						</button>
					</Show>
				</div>

				<div class={theme().cardFooter}>
					<span>{labels().noAccount} </span>
					<a href={signUpUrl()} class={theme().link}>
						{labels().signUp}
					</a>
				</div>
			</div>
		</Show>
	);
}
