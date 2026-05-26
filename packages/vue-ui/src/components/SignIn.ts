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
import type { PropType } from "vue";
import { computed, defineComponent, h, ref } from "vue";
import { useAuthUI } from "../composables";
import { Divider } from "../internal/Divider";
import { FormField } from "../internal/FormField";
import { SocialButtons } from "../internal/SocialButtons";
import { TwoFactorStep } from "../internal/TwoFactorStep";

/**
 * Pre-built sign-in form component.
 *
 * @example
 * ```vue
 * <SignIn
 *   emailAndPassword
 *   :oauth="['github', 'google']"
 *   passkey
 *   twoFactor
 *   redirectUrl="/dashboard"
 * />
 * ```
 */
export const SignIn = defineComponent({
	name: "SignIn",
	props: {
		emailAndPassword: { type: Boolean, default: true },
		username: { type: Boolean, default: false },
		passkey: { type: Boolean, default: false },
		twoFactor: { type: Boolean, default: false },
		magicLink: { type: Boolean, default: false },
		phoneNumber: { type: Boolean, default: false },
		emailOtp: { type: Boolean, default: false },
		oauth: {
			type: [Boolean, Array] as PropType<false | string[]>,
			default: undefined,
		},
		redirectUrl: { type: String, default: undefined },
		signUpUrl: { type: String, default: "/sign-up" },
		forgotPasswordUrl: { type: String, default: "/forgot-password" },
		theme: {
			type: Object as PropType<SignInConfig["theme"]>,
			default: undefined,
		},
		labels: {
			type: Object as PropType<SignInConfig["labels"]>,
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
		const labels = computed(() => allLabels.value.signIn);
		const client = ctx.client;

		const formData = ref<SignInFormData>(createSignInFormData());
		const flowState = ref<AuthFlowState>(createInitialSignInState());
		const fieldError = ref("");

		const updateField = <K extends keyof SignInFormData>(
			field: K,
			value: SignInFormData[K],
		) => {
			formData.value = { ...formData.value, [field]: value };
		};

		const handleEmailSignIn = async (e: Event) => {
			e.preventDefault();
			fieldError.value = "";

			const mode = props.username ? "username" : "email";
			const validationError = validateSignInForm(formData.value, mode);
			if (validationError) {
				fieldError.value = validationError;
				return;
			}

			flowState.value = { step: "submitting", error: null };

			try {
				const signIn = client.signIn as Record<
					string,
					(
						args: Record<string, unknown>,
					) => Promise<{ data?: unknown; error?: unknown }>
				>;

				let res: { data?: unknown; error?: unknown };
				if (props.username) {
					const fn = signIn.username;
					if (!fn) {
						fieldError.value = "Username sign-in is not configured.";
						flowState.value = {
							step: "error",
							error: { message: "Username sign-in is not configured." },
						};
						return;
					}
					res = await fn(
						buildUsernameSignInBody(formData.value, props.redirectUrl),
					);
				} else {
					const fn = signIn.email;
					if (!fn) {
						fieldError.value = "Email sign-in is not configured.";
						flowState.value = {
							step: "error",
							error: { message: "Email sign-in is not configured." },
						};
						return;
					}
					res = await fn(
						buildEmailSignInBody(formData.value, props.redirectUrl),
					);
				}

				const newState = processSignInResponse(res, flowState.value);
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

		const handlePasskeySignIn = async () => {
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
						"[better-auth/vue-ui] client.signIn.passkey is not available.",
					);
					return;
				}
				const res = await fn();
				if (res.error) {
					emit("error", toAuthUIError(res.error));
				} else {
					emit("success", res.data);
				}
			} catch (err) {
				emit("error", toAuthUIError(err));
			}
		};

		const handleMagicLink = async () => {
			fieldError.value = "";
			if (!formData.value.email) {
				fieldError.value = "Please enter your email first.";
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
					fieldError.value = "Magic link sign-in is not configured.";
					return;
				}
				const body: Record<string, unknown> = { email: formData.value.email };
				if (props.redirectUrl) body.callbackURL = props.redirectUrl;
				const res = await fn(body);
				if (res.error) {
					fieldError.value = toAuthUIError(res.error).message;
				} else {
					flowState.value = { step: "success", error: null };
					fieldError.value = labels.value.magicLinkSent;
				}
			} catch (err) {
				fieldError.value = toAuthUIError(err).message;
			}
		};

		const handleEmailOtp = async () => {
			fieldError.value = "";
			if (!formData.value.email) {
				fieldError.value = "Please enter your email first.";
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
					fieldError.value = "Email OTP is not configured.";
					return;
				}
				const res = await fn({
					email: formData.value.email,
					type: "sign-in",
				});
				if (res.error) {
					fieldError.value = toAuthUIError(res.error).message;
				} else {
					fieldError.value = labels.value.emailOtpSent;
				}
			} catch (err) {
				fieldError.value = toAuthUIError(err).message;
			}
		};

		return () => {
			const t = theme.value;
			const l = labels.value;
			const al = allLabels.value;

			if (props.twoFactor && flowState.value.step === "two-factor") {
				return h("div", { class: t.card, style: props.style }, [
					h(TwoFactorStep, {
						methods: flowState.value.twoFactorMethods ?? [],
						theme: t,
						labels: al.twoFactor,
						client,
						onSuccess: (data: unknown) => emit("success", data),
						onError: (err: unknown) => emit("error", err),
					}),
				]);
			}

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
						? h("form", { onSubmit: handleEmailSignIn }, [
								h("div", { class: t.cardContent }, [
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
										: h(FormField, {
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

									h(FormField, {
										label: l.password,
										error: "",
										theme: t,
										name: "password",
										type: "password",
										autoComplete: "current-password",
										modelValue: formData.value.password,
										"onUpdate:modelValue": (v: string) =>
											updateField("password", v),
									}),

									fieldError.value
										? h("p", { class: t.error }, fieldError.value)
										: null,

									h(
										"div",
										{
											style: {
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
											},
										},
										[
											h(
												"label",
												{
													style: {
														display: "flex",
														alignItems: "center",
														gap: "6px",
													},
												},
												[
													h("input", {
														type: "checkbox",
														checked: formData.value.rememberMe,
														onChange: (e: Event) =>
															updateField(
																"rememberMe",
																(e.target as HTMLInputElement).checked,
															),
													}),
													h("span", { class: t.label }, l.rememberMe),
												],
											),

											props.forgotPasswordUrl
												? h(
														"a",
														{
															href: props.forgotPasswordUrl,
															class: t.button.link,
														},
														l.forgotPassword,
													)
												: null,
										],
									),

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

					props.passkey
						? h(
								"button",
								{
									type: "button",
									class: t.button.social,
									onClick: handlePasskeySignIn,
								},
								l.passkey,
							)
						: null,

					props.magicLink
						? h(
								"button",
								{
									type: "button",
									class: t.button.social,
									onClick: handleMagicLink,
								},
								l.magicLink,
							)
						: null,

					props.emailOtp
						? h(
								"button",
								{
									type: "button",
									class: t.button.social,
									onClick: handleEmailOtp,
								},
								l.emailOtp,
							)
						: null,
				]),

				h("div", { class: t.cardFooter }, [
					h("span", null, `${l.noAccount} `),
					h("a", { href: props.signUpUrl, class: t.link }, l.signUp),
				]),
			]);
		};
	},
});
