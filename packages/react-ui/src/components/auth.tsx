import type { AuthRouterConfig } from "@better-auth/ui-core";
import { useMemo } from "react";
import { ForgotPassword } from "./forgot-password";
import { ResetPassword } from "./reset-password";
import { SignIn } from "./sign-in";
import { SignUp } from "./sign-up";

/**
 * Path-based auth router component.
 * Renders the appropriate auth component based on the current pathname.
 *
 * @example
 * ```tsx
 * <Auth
 *   path={pathname}
 *   signIn={{ oauth: ["github"], passkey: true }}
 *   signUp={{ username: true }}
 * />
 * ```
 */
export function Auth(props: AuthRouterConfig) {
	const {
		path,
		signInPath = "/sign-in",
		signUpPath = "/sign-up",
		forgotPasswordPath = "/forgot-password",
		resetPasswordPath = "/reset-password",
		fallback = "sign-in",
		signIn: signInProps,
		signUp: signUpProps,
		forgotPassword: forgotPasswordProps,
		resetPassword: resetPasswordProps,
		className,
		style,
		theme,
		labels,
	} = props;

	const normalizedPath = useMemo(() => {
		const p = path.split("?")[0]!.split("#")[0]!;
		return p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
	}, [path]);

	const sharedProps = { className, style, theme, labels };

	if (normalizedPath === signInPath) {
		return <SignIn {...sharedProps} {...signInProps} />;
	}

	if (normalizedPath === signUpPath) {
		return <SignUp {...sharedProps} {...signUpProps} />;
	}

	if (normalizedPath === forgotPasswordPath) {
		return <ForgotPassword {...sharedProps} {...forgotPasswordProps} />;
	}

	if (normalizedPath === resetPasswordPath) {
		return <ResetPassword {...sharedProps} {...resetPasswordProps} />;
	}

	// Fallback
	if (fallback === "sign-up") {
		return <SignUp {...sharedProps} {...signUpProps} />;
	}
	return <SignIn {...sharedProps} {...signInProps} />;
}
