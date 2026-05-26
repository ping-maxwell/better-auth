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
export type { AuthUIContextValue } from "./context";
export {
	buildContextValue,
	getAuthUIContext,
	setAuthUIContext,
} from "./context";
