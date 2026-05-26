// Provider

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
export { Auth } from "./components/auth";
export { ForgotPassword } from "./components/forgot-password";
export { ResetPassword } from "./components/reset-password";
// Components
export { SignIn } from "./components/sign-in";
export { SignUp } from "./components/sign-up";
export type { AuthUIContextValue, AuthUIProviderProps } from "./provider";
export { AuthUIProvider, useAuthUI } from "./provider";
