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
import type { PropType } from "vue";
import { computed, defineComponent, h, ref } from "vue";
import { useAuthUI } from "../composables";
import { FormField } from "../internal/FormField";

/**
 * Reset password form -- sets a new password using a token from the reset email.
 *
 * @example
 * ```vue
 * <ResetPassword :token="route.query.token" />
 * ```
 */
export const ResetPassword = defineComponent({
	name: "ResetPassword",
	props: {
		token: { type: String, default: undefined },
		redirectUrl: { type: String, default: undefined },
		theme: {
			type: Object as PropType<ResetPasswordConfig["theme"]>,
			default: undefined,
		},
		labels: {
			type: Object as PropType<ResetPasswordConfig["labels"]>,
			default: undefined,
		},
		className: { type: String, default: undefined },
		style: {
			type: Object as PropType<Record<string, string | number>>,
			default: undefined,
		},
	},
	emits: {
		success: (_data: unknown) => true,
		error: (_error: unknown) => true,
	},
	setup(props, { emit }) {
		const ctx = useAuthUI();

		const theme = computed(() =>
			props.theme ? mergeTheme({ ...ctx.theme, ...props.theme }) : ctx.theme,
		);
		const allLabels = computed(() =>
			props.labels
				? resolveLabels(ctx.locale, undefined, {
						...ctx.labels,
						...props.labels,
					})
				: ctx.labels,
		);
		const labels = computed(() => allLabels.value.resetPassword);
		const client = ctx.client;

		const resolvedToken = computed(() => {
			if (props.token) return props.token;
			if (typeof window !== "undefined") {
				const params = new URLSearchParams(window.location.search);
				return params.get("token") ?? undefined;
			}
			return undefined;
		});

		const formData = ref<ResetPasswordFormData>(createResetPasswordFormData());
		const flowState = ref<AuthFlowState>(createInitialResetPasswordState());
		const fieldError = ref("");

		const handleSubmit = async (e: Event) => {
			e.preventDefault();
			fieldError.value = "";

			if (!resolvedToken.value) {
				fieldError.value =
					"Missing reset token. Please use the link from your email.";
				return;
			}

			const validationError = validateResetPasswordForm(formData.value);
			if (validationError) {
				fieldError.value = validationError;
				return;
			}

			flowState.value = { step: "submitting", error: null };

			try {
				const fn = client.resetPassword as
					| ((
							body: Record<string, unknown>,
							opts?: Record<string, unknown>,
					  ) => Promise<{ data?: unknown; error?: unknown }>)
					| undefined;

				if (!fn) {
					fieldError.value = "Password reset is not configured.";
					flowState.value = {
						step: "error",
						error: { message: "Password reset is not configured." },
					};
					return;
				}

				const body = buildResetPasswordBody(
					formData.value,
					resolvedToken.value,
				);
				const res = await fn(body);
				const newState = processResetPasswordResponse(res);
				flowState.value = newState;

				if (newState.step === "error" && newState.error) {
					fieldError.value = newState.error.message;
					emit("error", newState.error);
				} else if (newState.step === "success") {
					emit("success", res.data);
					if (props.redirectUrl && typeof window !== "undefined") {
						window.location.href = props.redirectUrl;
					}
				}
			} catch (err) {
				const uiErr = toAuthUIError(err);
				flowState.value = { step: "error", error: uiErr };
				fieldError.value = uiErr.message;
				emit("error", uiErr);
			}
		};

		return () => {
			const t = theme.value;
			const l = labels.value;
			const cardClass = `${t.card}${props.className ? ` ${props.className}` : ""}`;

			if (flowState.value.step === "success") {
				return h("div", { class: cardClass, style: props.style }, [
					h("div", { class: t.cardHeader }, [
						h("h2", { class: t.cardTitle }, l.title),
						h("p", { class: t.cardDescription }, l.successMessage),
					]),
					h("div", { class: t.cardFooter }, [
						h(
							"a",
							{
								href: props.redirectUrl ?? "/sign-in",
								class: t.link,
							},
							l.backToSignIn,
						),
					]),
				]);
			}

			return h("div", { class: cardClass, style: props.style }, [
				h("div", { class: t.cardHeader }, [
					h("h2", { class: t.cardTitle }, l.title),
				]),

				h("form", { onSubmit: handleSubmit }, [
					h("div", { class: t.cardContent }, [
						h(FormField, {
							label: l.password,
							error: "",
							theme: t,
							name: "password",
							type: "password",
							autoComplete: "new-password",
							modelValue: formData.value.password,
							"onUpdate:modelValue": (v: string) => {
								formData.value = {
									...formData.value,
									password: v,
								};
							},
						}),

						h(FormField, {
							label: l.confirmPassword,
							error: "",
							theme: t,
							name: "confirmPassword",
							type: "password",
							autoComplete: "new-password",
							modelValue: formData.value.confirmPassword,
							"onUpdate:modelValue": (v: string) => {
								formData.value = {
									...formData.value,
									confirmPassword: v,
								};
							},
						}),

						fieldError.value
							? h("p", { class: t.error }, fieldError.value)
							: null,

						h(
							"button",
							{
								type: "submit",
								class: t.button.primary,
								disabled: flowState.value.step === "submitting",
							},
							flowState.value.step === "submitting" ? l.submitting : l.submit,
						),
					]),
				]),
			]);
		};
	},
});
