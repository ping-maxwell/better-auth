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
import { useCallback, useState } from "react";
import { useAuthUI } from "../hooks/use-auth-ui";
import { Divider } from "../internal/divider";
import { FormField } from "../internal/form-field";
import { SocialButtons } from "../internal/social-buttons";

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
	const theme = props.theme
		? mergeTheme({ ...ctx.theme, ...props.theme })
		: ctx.theme;
	const allLabels = props.labels
		? resolveLabels(ctx.locale, undefined, { ...ctx.labels, ...props.labels })
		: ctx.labels;
	const labels = allLabels.signUp;
	const client = ctx.client;

	const {
		emailAndPassword = true,
		username = false,
		name: showName = true,
		oauth,
		redirectUrl,
		signInUrl = "/sign-in",
		onSuccess,
		onError,
	} = props;

	const [formData, setFormData] =
		useState<SignUpFormData>(createSignUpFormData);
	const [flowState, setFlowState] = useState<AuthFlowState>(
		createInitialSignUpState,
	);
	const [fieldError, setFieldError] = useState("");

	const updateField = useCallback(
		<K extends keyof SignUpFormData>(field: K, value: SignUpFormData[K]) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setFieldError("");

			const validationError = validateSignUpForm(formData, {
				showName,
				showUsername: username,
			});
			if (validationError) {
				setFieldError(validationError);
				return;
			}

			setFlowState({ step: "submitting", error: null });

			try {
				const signUp = client.signUp as Record<
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

				const body = buildSignUpBody(formData, {
					showName,
					showUsername: username,
					redirectUrl,
				});
				const res = await fn(body);
				const newState = processSignUpResponse(res);
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
		[formData, showName, username, client, redirectUrl, onSuccess, onError],
	);

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

				{/* Sign-up form */}
				{emailAndPassword && (
					<form onSubmit={handleSubmit}>
						<div className={theme.cardContent}>
							{showName && (
								<FormField
									label={labels.name}
									error=""
									theme={theme}
									inputProps={{
										name: "name",
										type: "text",
										autoComplete: "name",
										value: formData.name,
										onChange: (e) => updateField("name", e.target.value),
									}}
								/>
							)}

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

							{username && (
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
							)}

							<FormField
								label={labels.password}
								error=""
								theme={theme}
								inputProps={{
									name: "password",
									type: "password",
									autoComplete: "new-password",
									value: formData.password,
									onChange: (e) => updateField("password", e.target.value),
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
										updateField("confirmPassword", e.target.value),
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
				)}
			</div>

			<div className={theme.cardFooter}>
				<span>{labels.hasAccount} </span>
				<a href={signInUrl} className={theme.link}>
					{labels.signIn}
				</a>
			</div>
		</div>
	);
}
