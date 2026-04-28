import type { BasePageOptions } from "../../types";

export interface ResetPasswordPageOptions extends BasePageOptions {
	/** URL for sign in page */
	signInUrl?: string;
	/** Minimum password length */
	minPasswordLength?: number;
}
