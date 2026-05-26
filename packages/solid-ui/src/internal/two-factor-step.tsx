import type { AuthUIError, Theme, TwoFactorLabels } from "@better-auth/ui-core";
import { toAuthUIError, validateTwoFactorCode } from "@better-auth/ui-core";
import { createSignal, For, Show } from "solid-js";
import { FormField } from "./form-field";

type TwoFactorMethod = "totp" | "otp" | "backup";

interface TwoFactorStepProps {
	methods: string[];
	theme: Theme;
	labels: TwoFactorLabels;
	client: Record<string, unknown>;
	onSuccess?: ((data: unknown) => void) | undefined;
	onError?: ((error: AuthUIError) => void) | undefined;
}

export function TwoFactorStep(props: TwoFactorStepProps) {
	const availableMethods = () =>
		(props.methods.length > 0 ? props.methods : ["totp"]) as TwoFactorMethod[];
	const [activeMethod, setActiveMethod] = createSignal<TwoFactorMethod>(
		availableMethods()[0]!,
	);
	const [code, setCode] = createSignal("");
	const [fieldError, setFieldError] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [otpSent, setOtpSent] = createSignal(false);

	const twoFactor = () =>
		(props.client.twoFactor ?? {}) as Record<
			string,
			(
				args: Record<string, unknown>,
			) => Promise<{ data?: unknown; error?: unknown }>
		>;

	const handleVerify = async (e: SubmitEvent) => {
		e.preventDefault();
		setFieldError("");

		const validationError = validateTwoFactorCode(code(), activeMethod());
		if (validationError) {
			setFieldError(validationError);
			return;
		}

		setSubmitting(true);
		try {
			let verifyFn:
				| ((
						args: Record<string, unknown>,
				  ) => Promise<{ data?: unknown; error?: unknown }>)
				| undefined;
			const tf = twoFactor();
			if (activeMethod() === "totp") verifyFn = tf.verifyTotp;
			else if (activeMethod() === "otp") verifyFn = tf.verifyOtp;
			else verifyFn = tf.verifyBackupCode;

			if (!verifyFn) {
				setFieldError("Two-factor verification is not configured.");
				setSubmitting(false);
				return;
			}

			const res = await verifyFn({ code: code() });
			if (res.error) {
				const err = toAuthUIError(res.error);
				setFieldError(err.message);
				props.onError?.(err);
			} else {
				props.onSuccess?.(res.data);
			}
		} catch (err) {
			const uiErr = toAuthUIError(err);
			setFieldError(uiErr.message);
			props.onError?.(uiErr);
		} finally {
			setSubmitting(false);
		}
	};

	const handleSendOtp = async () => {
		try {
			const sendFn = twoFactor().sendOtp;
			if (sendFn) {
				await sendFn({});
				setOtpSent(true);
			}
		} catch {
			/* best-effort */
		}
	};

	const codeLabel = () =>
		activeMethod() === "totp"
			? props.labels.totpCode
			: activeMethod() === "otp"
				? props.labels.otpCode
				: props.labels.backupCode;

	const otherMethods = () =>
		availableMethods().filter((m) => m !== activeMethod());

	return (
		<div>
			<div class={props.theme.cardHeader}>
				<h2 class={props.theme.cardTitle}>{props.labels.title}</h2>
				<p class={props.theme.cardDescription}>{props.labels.description}</p>
			</div>

			<form onSubmit={handleVerify} class={props.theme.cardContent}>
				<Show when={activeMethod() === "otp" && !otpSent()}>
					<button
						type="button"
						class={props.theme.button.primary}
						onClick={handleSendOtp}
					>
						{props.labels.sendOtp}
					</button>
				</Show>

				<FormField
					label={codeLabel()}
					error={fieldError()}
					theme={props.theme}
					inputProps={{
						name: "code",
						type: "text",
						autocomplete: "one-time-code",
						inputmode: activeMethod() === "backup" ? "text" : "numeric",
						value: code(),
						onInput: (e) => setCode(e.currentTarget.value),
						placeholder: activeMethod() === "backup" ? "XXXX-XXXX" : "000000",
					}}
				/>

				<button
					type="submit"
					class={props.theme.button.primary}
					disabled={submitting()}
				>
					{submitting() ? props.labels.submitting : props.labels.submit}
				</button>
			</form>

			<Show when={availableMethods().length > 1}>
				<div class={props.theme.cardFooter}>
					<For each={otherMethods()}>
						{(m) => (
							<button
								type="button"
								class={props.theme.button.link}
								onClick={() => {
									setActiveMethod(m);
									setCode("");
									setFieldError("");
								}}
							>
								{m === "totp"
									? props.labels.useTotp
									: m === "otp"
										? props.labels.useOtp
										: props.labels.useBackupCode}
							</button>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
