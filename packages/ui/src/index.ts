/**
 * @better-auth/ui - Pre-built UI pages for Better Auth
 *
 * This package provides server-rendered HTML pages for authentication flows.
 * Built with React, Tailwind CSS, and shadcn/ui components.
 *
 * @example
 * ```typescript
 * import { getSignInPage } from "@better-auth/ui";
 *
 * const html = getSignInPage({
 *   appName: "My App",
 *   apiBaseUrl: "/api/auth",
 *   socialProviders: [
 *     { id: "google", name: "Google" },
 *     { id: "github", name: "GitHub" }
 *   ]
 * });
 * ```
 *
 * Don't forget to serve the CSS file:
 * ```typescript
 * // Serve /__better-auth/styles.css from "@better-auth/ui/styles.css"
 * ```
 */

// Re-export shadcn/ui components for custom pages
export {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	buttonVariants,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Checkbox,
	Input,
	Label,
	providerIcons,
	Separator,
	SocialButton,
	SocialButtons,
} from "./components";
export { type RenderDocumentOptions, renderDocument } from "./lib/render";
// Utilities
export { cn } from "./lib/utils";
// Page options types
export type {
	ForgotPasswordPageOptions,
	ProfilePageOptions,
	ResetPasswordPageOptions,
	SignInPageOptions,
	SignUpPageOptions,
	VerifyEmailPageOptions,
} from "./pages";
// Page functions
export {
	getForgotPasswordPage,
	getProfilePage,
	getResetPasswordPage,
	getSignInPage,
	getSignUpPage,
	getVerifyEmailPage,
} from "./pages";
// Common types
export type {
	BasePageOptions,
	HSLColor,
	SocialProvider,
	UITheme,
} from "./types";
