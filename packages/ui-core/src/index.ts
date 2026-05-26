// Types

export type { ForgotPasswordFormData } from "./flows/forgot-password";
// Flows — forgot password
export {
	buildForgotPasswordBody,
	createForgotPasswordFormData,
	createInitialForgotPasswordState,
	processForgotPasswordResponse,
	validateForgotPasswordForm,
} from "./flows/forgot-password";
export type { ResetPasswordFormData } from "./flows/reset-password";
// Flows — reset password
export {
	buildResetPasswordBody,
	createInitialResetPasswordState,
	createResetPasswordFormData,
	processResetPasswordResponse,
	validateResetPasswordForm,
} from "./flows/reset-password";
export type { SignInFormData } from "./flows/sign-in";
// Flows — sign-in
export {
	buildEmailSignInBody,
	buildUsernameSignInBody,
	createInitialSignInState,
	createSignInFormData,
	processSignInResponse,
	toAuthUIError,
	validateSignInForm,
	validateTwoFactorCode,
} from "./flows/sign-in";
export type { SignUpFormData } from "./flows/sign-up";
// Flows — sign-up
export {
	buildSignUpBody,
	createInitialSignUpState,
	createSignUpFormData,
	processSignUpResponse,
	validateSignUpForm,
} from "./flows/sign-up";
export type { LocaleMap } from "./i18n";
// i18n
export { en, resolveLabels } from "./i18n";
// Icons
export { getProviderMeta, getProvidersMeta } from "./icons";
// Theme
export { defaultTheme, mergeTheme } from "./theme";
export type * from "./types";
export type { ValidationResult } from "./validation";
// Validation
export {
	validateConfirmPassword,
	validateEmail,
	validateName,
	validateOtp,
	validatePassword,
	validatePhoneNumber,
	validateRequired,
	validateUsername,
} from "./validation";
