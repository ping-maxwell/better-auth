import type {
	AuthRouterConfig,
	ForgotPasswordConfig,
	ResetPasswordConfig,
	SignInConfig,
	SignUpConfig,
	StyleProps,
} from "@better-auth/ui-core";
import type { Component, PropType } from "vue";
import { computed, defineComponent, h } from "vue";
import { ForgotPassword } from "./ForgotPassword";
import { ResetPassword } from "./ResetPassword";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";

/**
 * Path-based auth router component.
 * Renders the appropriate auth component based on the current pathname.
 *
 * @example
 * ```vue
 * <Auth
 *   :path="route.path"
 *   :signIn="{ oauth: ['github'], passkey: true }"
 *   :signUp="{ username: true }"
 * />
 * ```
 */
export const Auth = defineComponent({
	name: "Auth",
	props: {
		path: { type: String, required: true },
		signInPath: { type: String, default: "/sign-in" },
		signUpPath: { type: String, default: "/sign-up" },
		forgotPasswordPath: { type: String, default: "/forgot-password" },
		resetPasswordPath: { type: String, default: "/reset-password" },
		fallback: {
			type: String as PropType<"sign-in" | "sign-up">,
			default: "sign-in",
		},
		signIn: {
			type: Object as PropType<Omit<SignInConfig, keyof StyleProps>>,
			default: undefined,
		},
		signUp: {
			type: Object as PropType<Omit<SignUpConfig, keyof StyleProps>>,
			default: undefined,
		},
		forgotPassword: {
			type: Object as PropType<Omit<ForgotPasswordConfig, keyof StyleProps>>,
			default: undefined,
		},
		resetPassword: {
			type: Object as PropType<Omit<ResetPasswordConfig, keyof StyleProps>>,
			default: undefined,
		},
		className: { type: String, default: undefined },
		style: {
			type: Object as PropType<Record<string, string | number>>,
			default: undefined,
		},
		theme: {
			type: Object as PropType<AuthRouterConfig["theme"]>,
			default: undefined,
		},
		labels: {
			type: Object as PropType<AuthRouterConfig["labels"]>,
			default: undefined,
		},
	},
	setup(props) {
		const normalizedPath = computed(() => {
			const p = props.path.split("?")[0]!.split("#")[0]!;
			return p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
		});

		const renderChild = (
			component: Component,
			extraProps?: Record<string, unknown>,
		) => {
			return h(component, {
				className: props.className,
				style: props.style,
				theme: props.theme,
				labels: props.labels,
				...extraProps,
			});
		};

		return () => {
			if (normalizedPath.value === props.signInPath) {
				return renderChild(SignIn, props.signIn);
			}

			if (normalizedPath.value === props.signUpPath) {
				return renderChild(SignUp, props.signUp);
			}

			if (normalizedPath.value === props.forgotPasswordPath) {
				return renderChild(ForgotPassword, props.forgotPassword);
			}

			if (normalizedPath.value === props.resetPasswordPath) {
				return renderChild(ResetPassword, props.resetPassword);
			}

			if (props.fallback === "sign-up") {
				return renderChild(SignUp, props.signUp);
			}
			return renderChild(SignIn, props.signIn);
		};
	},
});
