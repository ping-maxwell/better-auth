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
import type { PropType } from "vue";
import { computed, defineComponent, h, ref } from "vue";
import { useAuthUI } from "../composables";
import { FormField } from "../internal/FormField";

/**
 * Forgot password form -- sends a password reset email.
 *
 * @example
 * ```vue
 * <ForgotPassword redirectUrl="/reset-password" />
 * ```
 */
export const ForgotPassword = defineComponent({
	name: "ForgotPassword",
	props: {
		redirectUrl: { type: String, default: undefined },
		signInUrl: { type: String, default: "/sign-in" },
		theme: {
			type: Object as PropType<ForgotPasswordConfig["theme"]>,
			default: undefined,
		},
		labels: {
			type: Object as PropType<ForgotPasswordConfig["labels"]>,
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
		const labels = computed(() => allLabels.value.forgotPassword);
		const client = ctx.client;

		const formData = ref<ForgotPasswordFormData>(
			createForgotPasswordFormData(),
		);
		const flowState = ref<AuthFlowState>(createInitialForgotPasswordState());
		const fieldError = ref("");

		const handleSubmit = async (e: Event) => {
			e.preventDefault();
			fieldError.value = "";

			const validationError = validateForgotPasswordForm(formData.value);
			if (validationError) {
				fieldError.value = validationError;
				return;
			}

			flowState.value = { step: "submitting", error: null };

			try {
				const fn = client.requestPasswordReset as
					| ((
							args: Record<string, unknown>,
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

				const body = buildForgotPasswordBody(formData.value, props.redirectUrl);
				const res = await fn(body);
				const newState = processForgotPasswordResponse(res);
				flowState.value = newState;

				if (newState.step === "error" && newState.error) {
					fieldError.value = newState.error.message;
					emit("error", newState.error);
				} else if (newState.step === "success") {
					emit("success", res.data);
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
						h("a", { href: props.signInUrl, class: t.link }, l.backToSignIn),
					]),
				]);
			}

			return h("div", { class: cardClass, style: props.style }, [
				h("div", { class: t.cardHeader }, [
					h("h2", { class: t.cardTitle }, l.title),
					h("p", { class: t.cardDescription }, l.description),
				]),

				h("form", { onSubmit: handleSubmit }, [
					h("div", { class: t.cardContent }, [
						h(FormField, {
							label: l.email,
							error: "",
							theme: t,
							name: "email",
							type: "email",
							autoComplete: "email",
							modelValue: formData.value.email,
							"onUpdate:modelValue": (v: string) => {
								formData.value = { ...formData.value, email: v };
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

				h("div", { class: t.cardFooter }, [
					h("a", { href: props.signInUrl, class: t.link }, l.backToSignIn),
				]),
			]);
		};
	},
});
