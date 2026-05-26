/**
 * Astro UI components for Better Auth.
 *
 * These are React components intended for use in Astro islands
 * with the `client:load` directive.
 *
 * @example
 * ```astro
 * ---
 * import { AuthUIProvider, SignIn } from "@better-auth/astro-ui"
 * import { authClient } from "../lib/auth-client"
 * ---
 *
 * <AuthUIProvider client={authClient} client:load>
 *   <SignIn oauth={["github", "google"]} client:load />
 * </AuthUIProvider>
 * ```
 */

export type {
	AuthRouterConfig,
	AuthUIConfig,
	AuthUIError,
	AuthUIProviderProps,
	ForgotPasswordConfig,
	Labels,
	ResetPasswordConfig,
	SignInConfig,
	SignUpConfig,
	Theme,
} from "@better-auth/react-ui";
export {
	Auth,
	AuthUIProvider,
	ForgotPassword,
	ResetPassword,
	SignIn,
	SignUp,
	useAuthUI,
} from "@better-auth/react-ui";
