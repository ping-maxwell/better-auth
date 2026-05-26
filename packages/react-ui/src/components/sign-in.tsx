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
import { useCallback, useState } from "react";
import { useAuthUI } from "../hooks/use-auth-ui";
import { Divider } from "../internal/divider";
import { FormField } from "../internal/form-field";
import { SocialButtons } from "../internal/social-buttons";
import { TwoFactorStep } from "../internal/two-factor-step";

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
	const theme = props.theme
		? mergeTheme({ ...ctx.theme, ...props.theme })
		: ctx.theme;
	const allLabels = props.labels
		? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
		: ctx.labels;
	const labels = allLabels.signIn;
	const client = ctx.client;

	const {
		emailAndPassword = true,
		username = false,
		passkey = false,
		twoFactor = false,
		magicLink = false,
		phoneNumber: _phoneNumber = false,
		emailOtp = false,
		oauth,
		redirectUrl,
		signUpUrl = "/sign-up",
		forgotPasswordUrl = "/forgot-password",
		onSuccess,
		onError,
	} = props;

	const [formData, setFormData] =
		useState<SignInFormData>(createSignInFormData);
	const [flowState, setFlowState] = useState<AuthFlowState>(
		createInitialSignInState,
	);
	const [fieldError, setFieldError] = useState("");

	const updateField = useCallback(
		<K extends keyof SignInFormData>(field: K, value: SignInFormData[K]) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const handleEmailSignIn = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setFieldError("");

			const mode = username ? "username" : "email";
			const validationError = validateSignInForm(formData, mode);
			if (validationError) {
				setFieldError(validationError);
				return;
			}

			setFlowState({ step: "submitting", error: null });

			try {
				const signIn = client.signIn as Record<
					string,
					(
						args: Record<string, unknown>,
					) => Promise<{ data?: unknown; error?: unknown }>
				>;

				let res: { data?: unknown; error?: unknown };
				if (username) {
					const fn = signIn.username;
					if (!fn) {
						setFieldError("Username sign-in is not configured.");
						setFlowState({
							step: "error",
							error: { message: "Username sign-in is not configured." },
						});
						return;
					}
					res = await fn(buildUsernameSignInBody(formData, redirectUrl));
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
					res = await fn(buildEmailSignInBody(formData, redirectUrl));
				}

				const newState = processSignInResponse(res, flowState);
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
		[formData, username, client, redirectUrl, flowState, onSuccess, onError],
	);

	const handlePasskeySignIn = useCallback(async () => {
		try {
			const signIn = client.signIn as Record<
				string,
				(
					args?: Record<string, unknown>,
				) => Promise<{ data?: unknown; error?: unknown }>
			>;
			const fn = signIn.passkey;
			if (!fn) {
				console.error(
					"[better-auth/react-ui] client.signIn.passkey is not available.",
				);
				return;
			}
			const res = await fn();
			if (res.error) {
				onError?.(toAuthUIError(res.error));
			} else {
				onSuccess?.(res.data);
			}
		} catch (err) {
			onError?.(toAuthUIError(err));
		}
	}, [client, onSuccess, onError]);

	const handleMagicLink = useCallback(async () => {
		setFieldError("");
		if (!formData.email) {
			setFieldError("Please enter your email first.");
			return;
		}

		try {
			const signIn = client.signIn as Record<
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
			const body: Record<string, unknown> = { email: formData.email };
			if (redirectUrl) body.callbackURL = redirectUrl;
			const res = await fn(body);
			if (res.error) {
				setFieldError(toAuthUIError(res.error).message);
			} else {
				setFlowState({ step: "success", error: null });
				setFieldError(labels.magicLinkSent);
			}
		} catch (err) {
			setFieldError(toAuthUIError(err).message);
		}
	}, [client, formData.email, redirectUrl, labels.magicLinkSent]);

	const handleEmailOtp = useCallback(async () => {
		setFieldError("");
		if (!formData.email) {
			setFieldError("Please enter your email first.");
			return;
		}

		try {
			const emailOtpNs = client.emailOtp as
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
			const res = await fn({ email: formData.email, type: "sign-in" });
			if (res.error) {
				setFieldError(toAuthUIError(res.error).message);
			} else {
				setFieldError(labels.emailOtpSent);
			}
		} catch (err) {
			setFieldError(toAuthUIError(err).message);
		}
	}, [client, formData.email, labels.emailOtpSent]);

	// Two-factor challenge step
	if (twoFactor && flowState.step === "two-factor") {
		return (
			<div className={theme.card} style={props.style}>
				<TwoFactorStep
					methods={flowState.twoFactorMethods ?? []}
					theme={theme}
					labels={allLabels.twoFactor}
					client={client}
					onSuccess={onSuccess}
					onError={onError}
				/>
			</div>
		);
	}

	const showDivider =
		emailAndPassword && oauth && Array.isArray(oauth) && oauth.length > 0;

	return (
		<div
			className={`${theme.card}${props.className ? ` ${props.className}` : ""}`}
			style={props.style}
		>
			<div className={theme.cardHeader}>
				<h2 className={theme.cardTitle}>{labels.title}</h2>
			</div>

			<div className={theme.cardContent}>
				{/* OAuth buttons */}
				{oauth && Array.isArray(oauth) && oauth.length > 0 && (
					<SocialButtons
						providers={oauth}
						theme={theme}
						redirectUrl={redirectUrl}
						onError={(err) => onError?.(toAuthUIError(err))}
						client={client}
					/>
				)}

				{showDivider && <Divider text={labels.orContinueWith} theme={theme} />}

				{/* Email/password or username/password form */}
				{emailAndPassword && (
					<form onSubmit={handleEmailSignIn}>
						<div className={theme.cardContent}>
							{username ? (
								<FormField
									label={labels.username}
									error=""
									theme={theme}
									inputProps={{
										name: "username",
										type: "text",
										autoComplete: "username",
										value: formData.username,
										onChange: (e) => updateField("username", e.target.value),
									}}
								/>
							) : (
								<FormField
									label={labels.email}
									error=""
									theme={theme}
									inputProps={{
										name: "email",
										type: "email",
										autoComplete: "email",
										value: formData.email,
										onChange: (e) => updateField("email", e.target.value),
									}}
								/>
							)}

							<FormField
								label={labels.password}
								error=""
								theme={theme}
								inputProps={{
									name: "password",
									type: "password",
									autoComplete: "current-password",
									value: formData.password,
									onChange: (e) => updateField("password", e.target.value),
								}}
							/>

							{fieldError && <p className={theme.error}>{fieldError}</p>}

							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<label
									style={{ display: "flex", alignItems: "center", gap: 6 }}
								>
									<input
										type="checkbox"
										checked={formData.rememberMe}
										onChange={(e) =>
											updateField("rememberMe", e.target.checked)
										}
									/>
									<span className={theme.label}>{labels.rememberMe}</span>
								</label>

								{forgotPasswordUrl && (
									<a href={forgotPasswordUrl} className={theme.button.link}>
										{labels.forgotPassword}
									</a>
								)}
							</div>

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
				)}

				{/* Alternative sign-in methods */}
				{passkey && (
					<button
						type="button"
						className={theme.button.social}
						onClick={handlePasskeySignIn}
					>
						{labels.passkey}
					</button>
				)}

				{magicLink && (
					<button
						type="button"
						className={theme.button.social}
						onClick={handleMagicLink}
					>
						{labels.magicLink}
					</button>
				)}

				{emailOtp && (
					<button
						type="button"
						className={theme.button.social}
						onClick={handleEmailOtp}
					>
						{labels.emailOtp}
					</button>
				)}
			</div>

			<div className={theme.cardFooter}>
				<span>{labels.noAccount} </span>
				<a href={signUpUrl} className={theme.link}>
					{labels.signUp}
				</a>
			</div>
		</div>
	);
}
