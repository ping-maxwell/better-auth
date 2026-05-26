import type { AuthRouterConfig } from "@better-auth/ui-core";
import { createMemo, Match, Switch } from "solid-js";
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
 *   path={pathname()}
 *   signIn={{ oauth: ["github"], passkey: true }}
 *   signUp={{ username: true }}
 * />
 * ```
 */
export function Auth(props: AuthRouterConfig) {
	const signInPath = () => props.signInPath ?? "/sign-in";
	const signUpPath = () => props.signUpPath ?? "/sign-up";
	const forgotPasswordPath = () =>
		props.forgotPasswordPath ?? "/forgot-password";
	const resetPasswordPath = () => props.resetPasswordPath ?? "/reset-password";
	const fallback = () => props.fallback ?? "sign-in";

	const normalizedPath = createMemo(() => {
		const p = props.path.split("?")[0]!.split("#")[0]!;
		return p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
	});

	const sharedProps = () => ({
		className: props.className,
		style: props.style,
		theme: props.theme,
		labels: props.labels,
	});

	return (
		<Switch
			fallback={
				fallback() === "sign-up" ? (
					<SignUp {...sharedProps()} {...props.signUp} />
				) : (
					<SignIn {...sharedProps()} {...props.signIn} />
				)
			}
		>
			<Match when={normalizedPath() === signInPath()}>
				<SignIn {...sharedProps()} {...props.signIn} />
			</Match>
			<Match when={normalizedPath() === signUpPath()}>
				<SignUp {...sharedProps()} {...props.signUp} />
			</Match>
			<Match when={normalizedPath() === forgotPasswordPath()}>
				<ForgotPassword {...sharedProps()} {...props.forgotPassword} />
			</Match>
			<Match when={normalizedPath() === resetPasswordPath()}>
				<ResetPassword {...sharedProps()} {...props.resetPassword} />
			</Match>
		</Switch>
	);
}
