import type { BasePageOptions } from "../../types";

export interface ProfilePageOptions extends BasePageOptions {
	/** Enable name editing */
	editableName?: boolean;
	/** Enable password change */
	changePassword?: boolean;
	/** URL for sign in page (for sign out redirect) */
	signInUrl?: string;
}
