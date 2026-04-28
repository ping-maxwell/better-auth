import type { BasePageOptions } from "../../types";

export interface VerifyEmailPageOptions extends BasePageOptions {
	/** URL for sign in page */
	signInUrl?: string;
	/** URL to redirect after successful verification */
	redirectTo?: string;
}
