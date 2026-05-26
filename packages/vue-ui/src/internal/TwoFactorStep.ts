import type { AuthUIError, Theme, TwoFactorLabels } from "@better-auth/ui-core";
import { toAuthUIError, validateTwoFactorCode } from "@better-auth/ui-core";
import type { PropType } from "vue";
import { defineComponent, h, ref } from "vue";
import { FormField } from "./FormField";

type TwoFactorMethod = "totp" | "otp" | "backup";

export const TwoFactorStep = defineComponent({
	name: "TwoFactorStep",
	props: {
		methods: { type: Array as PropType<string[]>, required: true },
		theme: { type: Object as PropType<Theme>, required: true },
		labels: { type: Object as PropType<TwoFactorLabels>, required: true },
		client: {
			type: Object as PropType<Record<string, unknown>>,
			required: true,
		},
	},
	emits: {
		success: (_data: unknown) => true,
		error: (_error: AuthUIError) => true,
	},
	setup(props, { emit }) {
		const availableMethods = (
			props.methods.length > 0 ? props.methods : ["totp"]
		) as TwoFactorMethod[];

		const activeMethod = ref<TwoFactorMethod>(availableMethods[0]!);
		const code = ref("");
		const fieldError = ref("");
		const submitting = ref(false);
		const otpSent = ref(false);

		const twoFactor = (props.client.twoFactor ?? {}) as Record<
			string,
			(
				args: Record<string, unknown>,
			) => Promise<{ data?: unknown; error?: unknown }>
		>;

		const handleVerify = async (e: Event) => {
			e.preventDefault();
			fieldError.value = "";

			const validationError = validateTwoFactorCode(
				code.value,
				activeMethod.value,
			);
			if (validationError) {
				fieldError.value = validationError;
				return;
			}

			submitting.value = true;
			try {
				let verifyFn:
					| ((
							args: Record<string, unknown>,
					  ) => Promise<{ data?: unknown; error?: unknown }>)
					| undefined;
				if (activeMethod.value === "totp") verifyFn = twoFactor.verifyTotp;
				else if (activeMethod.value === "otp") verifyFn = twoFactor.verifyOtp;
				else verifyFn = twoFactor.verifyBackupCode;

				if (!verifyFn) {
					fieldError.value = "Two-factor verification is not configured.";
					submitting.value = false;
					return;
				}

				const res = await verifyFn({ code: code.value });
				if (res.error) {
					const err = toAuthUIError(res.error);
					fieldError.value = err.message;
					emit("error", err);
				} else {
					emit("success", res.data);
				}
			} catch (err) {
				const uiErr = toAuthUIError(err);
				fieldError.value = uiErr.message;
				emit("error", uiErr);
			} finally {
				submitting.value = false;
			}
		};

		const handleSendOtp = async () => {
			try {
				const sendFn = twoFactor.sendOtp;
				if (sendFn) {
					await sendFn({});
					otpSent.value = true;
				}
			} catch {
				/* best-effort */
			}
		};

		return () => {
			const labels = props.labels;
			const theme = props.theme;

			const codeLabel =
				activeMethod.value === "totp"
					? labels.totpCode
					: activeMethod.value === "otp"
						? labels.otpCode
						: labels.backupCode;

			return h("div", null, [
				h("div", { class: theme.cardHeader }, [
					h("h2", { class: theme.cardTitle }, labels.title),
					h("p", { class: theme.cardDescription }, labels.description),
				]),

				h("form", { onSubmit: handleVerify, class: theme.cardContent }, [
					activeMethod.value === "otp" && !otpSent.value
						? h(
								"button",
								{
									type: "button",
									class: theme.button.primary,
									onClick: handleSendOtp,
								},
								labels.sendOtp,
							)
						: null,

					h(FormField, {
						label: codeLabel,
						error: fieldError.value,
						theme,
						name: "code",
						type: "text",
						autoComplete: "one-time-code",
						inputMode: activeMethod.value === "backup" ? "text" : "numeric",
						modelValue: code.value,
						placeholder:
							activeMethod.value === "backup" ? "XXXX-XXXX" : "000000",
						"onUpdate:modelValue": (v: string) => {
							code.value = v;
						},
					}),

					h(
						"button",
						{
							type: "submit",
							class: theme.button.primary,
							disabled: submitting.value,
						},
						submitting.value ? labels.submitting : labels.submit,
					),
				]),

				availableMethods.length > 1
					? h(
							"div",
							{ class: theme.cardFooter },
							availableMethods
								.filter((m) => m !== activeMethod.value)
								.map((m) =>
									h(
										"button",
										{
											key: m,
											type: "button",
											class: theme.button.link,
											onClick: () => {
												activeMethod.value = m;
												code.value = "";
												fieldError.value = "";
											},
										},
										m === "totp"
											? labels.useTotp
											: m === "otp"
												? labels.useOtp
												: labels.useBackupCode,
									),
								),
						)
					: null,
			]);
		};
	},
});
