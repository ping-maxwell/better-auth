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
import type { PropType } from "vue";
import { computed, defineComponent, h, ref } from "vue";
import { useAuthUI } from "../composables";
import { Divider } from "../internal/Divider";
import { FormField } from "../internal/FormField";
import { SocialButtons } from "../internal/SocialButtons";

/**
 * Pre-built sign-up form component.
 *
 * @example
 * ```vue
 * <SignUp
 *   emailAndPassword
 *   username
 *   :oauth="['github', 'google']"
 *   redirectUrl="/dashboard"
 * />
 * ```
 */
export const SignUp = defineComponent({
	name: "SignUp",
	props: {
		emailAndPassword: { type: Boolean, default: true },
		username: { type: Boolean, default: false },
		name: { type: Boolean, default: true },
		oauth: {
			type: [Boolean, Array] as PropType<false | string[]>,
			default: undefined,
		},
		redirectUrl: { type: String, default: undefined },
		signInUrl: { type: String, default: "/sign-in" },
		theme: {
			type: Object as PropType<SignUpConfig["theme"]>,
			default: undefined,
		},
		labels: {
			type: Object as PropType<SignUpConfig["labels"]>,
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
		const labels = computed(() => allLabels.value.signUp);
		const client = ctx.client;

		const formData = ref<SignUpFormData>(createSignUpFormData());
		const flowState = ref<AuthFlowState>(createInitialSignUpState());
		const fieldError = ref("");

		const updateField = <K extends keyof SignUpFormData>(
			field: K,
			value: SignUpFormData[K],
		) => {
			formData.value = { ...formData.value, [field]: value };
		};

		const handleSubmit = async (e: Event) => {
			e.preventDefault();
			fieldError.value = "";

			const validationError = validateSignUpForm(formData.value, {
				showName: props.name,
				showUsername: props.username,
			});
			if (validationError) {
				fieldError.value = validationError;
				return;
			}

			flowState.value = { step: "submitting", error: null };

			try {
				const signUp = client.signUp as Record<
					string,
					(
						args: Record<string, unknown>,
					) => Promise<{ data?: unknown; error?: unknown }>
				>;
				const fn = signUp?.email;
				if (!fn) {
					fieldError.value = "Sign-up is not configured.";
					flowState.value = {
						step: "error",
						error: { message: "Sign-up is not configured." },
					};
					return;
				}

				const body = buildSignUpBody(formData.value, {
					showName: props.name,
					showUsername: props.username,
					redirectUrl: props.redirectUrl,
				});
				const res = await fn(body);
				const newState = processSignUpResponse(res);
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

			const showDivider =
				props.emailAndPassword &&
				props.oauth &&
				Array.isArray(props.oauth) &&
				props.oauth.length > 0;

			const cardClass = `${t.card}${props.className ? ` ${props.className}` : ""}`;

			return h("div", { class: cardClass, style: props.style }, [
				h("div", { class: t.cardHeader }, [
					h("h2", { class: t.cardTitle }, l.title),
				]),

				h("div", { class: t.cardContent }, [
					props.oauth && Array.isArray(props.oauth) && props.oauth.length > 0
						? h(SocialButtons, {
								providers: props.oauth,
								theme: t,
								redirectUrl: props.redirectUrl,
								client,
								onError: (err: unknown) => emit("error", toAuthUIError(err)),
							})
						: null,

					showDivider ? h(Divider, { text: l.orContinueWith, theme: t }) : null,

					props.emailAndPassword
						? h("form", { onSubmit: handleSubmit }, [
								h("div", { class: t.cardContent }, [
									props.name
										? h(FormField, {
												label: l.name,
												error: "",
												theme: t,
												name: "name",
												type: "text",
												autoComplete: "name",
												modelValue: formData.value.name,
												"onUpdate:modelValue": (v: string) =>
													updateField("name", v),
											})
										: null,

									h(FormField, {
										label: l.email,
										error: "",
										theme: t,
										name: "email",
										type: "email",
										autoComplete: "email",
										modelValue: formData.value.email,
										"onUpdate:modelValue": (v: string) =>
											updateField("email", v),
									}),

									props.username
										? h(FormField, {
												label: l.username,
												error: "",
												theme: t,
												name: "username",
												type: "text",
												autoComplete: "username",
												modelValue: formData.value.username,
												"onUpdate:modelValue": (v: string) =>
													updateField("username", v),
											})
										: null,

									h(FormField, {
										label: l.password,
										error: "",
										theme: t,
										name: "password",
										type: "password",
										autoComplete: "new-password",
										modelValue: formData.value.password,
										"onUpdate:modelValue": (v: string) =>
											updateField("password", v),
									}),

									h(FormField, {
										label: l.confirmPassword,
										error: "",
										theme: t,
										name: "confirmPassword",
										type: "password",
										autoComplete: "new-password",
										modelValue: formData.value.confirmPassword,
										"onUpdate:modelValue": (v: string) =>
											updateField("confirmPassword", v),
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
										flowState.value.step === "submitting"
											? l.submitting
											: l.submit,
									),
								]),
							])
						: null,
				]),

				h("div", { class: t.cardFooter }, [
					h("span", null, `${l.hasAccount} `),
					h("a", { href: props.signInUrl, class: t.link }, l.signIn),
				]),
			]);
		};
	},
});
