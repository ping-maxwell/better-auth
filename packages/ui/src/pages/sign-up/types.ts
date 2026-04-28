import type { BasePageOptions, SocialProvider } from "../../types";

export interface SignUpPageOptions extends BasePageOptions {
	/** Enable email/password sign up */
	emailPassword?: boolean;
	/** Social providers to show */
	socialProviders?: SocialProvider[];
	/** Whether email verification is required */
	requireEmailVerification?: boolean;
	/** URL for sign in page */
	signInUrl?: string;
	/** URL to redirect after successful sign up */
	redirectTo?: string;
	/** Minimum password length */
	minPasswordLength?: number;
}
