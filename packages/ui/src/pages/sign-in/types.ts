import type { BasePageOptions, SocialProvider } from "../../types";

export interface SignInPageOptions extends BasePageOptions {
	/** Enable email/password sign in */
	emailPassword?: boolean;
	/** Enable passkey sign in */
	passkey?: boolean;
	/** Enable magic link sign in */
	magicLink?: boolean;
	/** Enable remember me checkbox */
	rememberMe?: boolean;
	/** Social providers to show */
	socialProviders?: SocialProvider[];
	/** URL for sign up page */
	signUpUrl?: string;
	/** URL for forgot password page */
	forgotPasswordUrl?: string;
	/** URL to redirect after successful sign in */
	redirectTo?: string;
}
