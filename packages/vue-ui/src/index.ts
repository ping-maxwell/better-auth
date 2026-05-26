// Composables (provide/inject)

// Re-export core types for convenience
export type {
	AuthRouterConfig,
	AuthUIConfig,
	AuthUIError,
	ForgotPasswordConfig,
	Labels,
	ResetPasswordConfig,
	SignInConfig,
	SignUpConfig,
	Theme,
} from "@better-auth/ui-core";
export { Auth } from "./components/Auth";
export { ForgotPassword } from "./components/ForgotPassword";
export { ResetPassword } from "./components/ResetPassword";
// Components
export { SignIn } from "./components/SignIn";
export { SignUp } from "./components/SignUp";
export type { AuthUIContextValue } from "./composables";
export { provideAuthUI, useAuthUI } from "./composables";
