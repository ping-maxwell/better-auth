<script lang="ts">
import type { AuthRouterConfig } from "@better-auth/ui-core";

interface Props extends AuthRouterConfig {}

let {
	path,
	signInPath = "/sign-in",
	signUpPath = "/sign-up",
	forgotPasswordPath = "/forgot-password",
	resetPasswordPath = "/reset-password",
	fallback = "sign-in",
	signIn: signInProps = undefined,
	signUp: signUpProps = undefined,
	forgotPassword: forgotPasswordProps = undefined,
	resetPassword: resetPasswordProps = undefined,
	className = undefined,
	style = undefined,
	theme = undefined,
	labels = undefined,
}: Props = $props();

const normalizedPath = $derived.by(() => {
	const p = path.split("?")[0]!.split("#")[0]!;
	return p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
});

const _sharedProps = $derived({ className, style, theme, labels });

type ActiveView = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

const _activeView = $derived.by((): ActiveView => {
	if (normalizedPath === signInPath) return "sign-in";
	if (normalizedPath === signUpPath) return "sign-up";
	if (normalizedPath === forgotPasswordPath) return "forgot-password";
	if (normalizedPath === resetPasswordPath) return "reset-password";
	return fallback === "sign-up" ? "sign-up" : "sign-in";
});
</script>

{#if activeView === "sign-in"}
	<SignIn {...sharedProps} {...signInProps} />
{:else if activeView === "sign-up"}
	<SignUp {...sharedProps} {...signUpProps} />
{:else if activeView === "forgot-password"}
	<ForgotPassword {...sharedProps} {...forgotPasswordProps} />
{:else if activeView === "reset-password"}
	<ResetPassword {...sharedProps} {...resetPasswordProps} />
{/if}
