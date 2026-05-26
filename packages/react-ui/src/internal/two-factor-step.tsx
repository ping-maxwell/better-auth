import type { AuthUIError, Theme, TwoFactorLabels } from "@better-auth/ui-core";
import { toAuthUIError, validateTwoFactorCode } from "@better-auth/ui-core";
import { useCallback, useState } from "react";
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

export function TwoFactorStep({
	methods,
	theme,
	labels,
	client,
	onSuccess,
	onError,
}: TwoFactorStepProps) {
	const availableMethods = (
		methods.length > 0 ? methods : ["totp"]
	) as TwoFactorMethod[];
	const [activeMethod, setActiveMethod] = useState<TwoFactorMethod>(
		availableMethods[0]!,
	);
	const [code, setCode] = useState("");
	const [fieldError, setFieldError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [otpSent, setOtpSent] = useState(false);

	const twoFactor = (client.twoFactor ?? {}) as Record<
		string,
		(
			args: Record<string, unknown>,
		) => Promise<{ data?: unknown; error?: unknown }>
	>;

	const handleVerify = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setFieldError("");

			const validationError = validateTwoFactorCode(code, activeMethod);
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
				if (activeMethod === "totp") verifyFn = twoFactor.verifyTotp;
				else if (activeMethod === "otp") verifyFn = twoFactor.verifyOtp;
				else verifyFn = twoFactor.verifyBackupCode;

				if (!verifyFn) {
					setFieldError("Two-factor verification is not configured.");
					setSubmitting(false);
					return;
				}

				const res = await verifyFn({ code });
				if (res.error) {
					const err = toAuthUIError(res.error);
					setFieldError(err.message);
					onError?.(err);
				} else {
					onSuccess?.(res.data);
				}
			} catch (err) {
				const uiErr = toAuthUIError(err);
				setFieldError(uiErr.message);
				onError?.(uiErr);
			} finally {
				setSubmitting(false);
			}
		},
		[code, activeMethod, twoFactor, onSuccess, onError],
	);

	const handleSendOtp = useCallback(async () => {
		try {
			const sendFn = twoFactor.sendOtp;
			if (sendFn) {
				await sendFn({});
				setOtpSent(true);
			}
		} catch {
			/* best-effort */
		}
	}, [twoFactor]);

	const codeLabel =
		activeMethod === "totp"
			? labels.totpCode
			: activeMethod === "otp"
				? labels.otpCode
				: labels.backupCode;

	return (
		<div>
			<div className={theme.cardHeader}>
				<h2 className={theme.cardTitle}>{labels.title}</h2>
				<p className={theme.cardDescription}>{labels.description}</p>
			</div>

			<form onSubmit={handleVerify} className={theme.cardContent}>
				{activeMethod === "otp" && !otpSent && (
					<button
						type="button"
						className={theme.button.primary}
						onClick={handleSendOtp}
					>
						{labels.sendOtp}
					</button>
				)}

				<FormField
					label={codeLabel}
					error={fieldError}
					theme={theme}
					inputProps={{
						name: "code",
						type: "text",
						autoComplete: "one-time-code",
						inputMode: activeMethod === "backup" ? "text" : "numeric",
						value: code,
						onChange: (e) => setCode(e.target.value),
						placeholder: activeMethod === "backup" ? "XXXX-XXXX" : "000000",
					}}
				/>

				<button
					type="submit"
					className={theme.button.primary}
					disabled={submitting}
				>
					{submitting ? labels.submitting : labels.submit}
				</button>
			</form>

			{availableMethods.length > 1 && (
				<div className={theme.cardFooter}>
					{availableMethods
						.filter((m) => m !== activeMethod)
						.map((m) => (
							<button
								key={m}
								type="button"
								className={theme.button.link}
								onClick={() => {
									setActiveMethod(m);
									setCode("");
									setFieldError("");
								}}
							>
								{m === "totp"
									? labels.useTotp
									: m === "otp"
										? labels.useOtp
										: labels.useBackupCode}
							</button>
						))}
				</div>
			)}
		</div>
	);
}
