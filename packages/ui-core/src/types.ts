/**
 * Styling props shared by all UI components.
 */
export interface StyleProps {
	/** Additional CSS class name appended to the component root. */
	className?: string | undefined;
	/** Inline style object applied to the component root. */
	style?: Record<string, string | number> | undefined;
	/** Granular theme overrides (deep-merged with defaults). */
	theme?: Partial<Theme> | undefined;
	/** UI label overrides (deep-merged with locale defaults). */
	labels?: Partial<Labels> | undefined;
}

/**
 * Callback props shared by auth form components.
 */
export interface CallbackProps {
	/** Called after a successful auth action with the response data. */
	onSuccess?: ((data: unknown) => void) | undefined;
	/** Called when an auth action fails with the error object. */
	onError?: ((error: AuthUIError) => void) | undefined;
}

export interface AuthUIError {
	code?: string | undefined;
	message: string;
	status?: number | undefined;
}

// ---------------------------------------------------------------------------
// Component configs
// ---------------------------------------------------------------------------

export interface SignInConfig extends StyleProps, CallbackProps {
	/** Enable email + password sign-in (default: true). */
	emailAndPassword?: boolean | undefined;
	/** Show username field and use username sign-in (requires username plugin). */
	username?: boolean | undefined;
	/** Show passkey button (requires passkey plugin). */
	passkey?: boolean | undefined;
	/** Handle two-factor challenge inline (requires two-factor plugin). */
	twoFactor?: boolean | undefined;
	/** Show magic link option (requires magic-link plugin). */
	magicLink?: boolean | undefined;
	/** Show phone number sign-in (requires phone-number plugin). */
	phoneNumber?: boolean | undefined;
	/** Show email OTP sign-in (requires email-otp plugin). */
	emailOtp?: boolean | undefined;
	/** OAuth providers to display. `false` disables, array of provider IDs enables. */
	oauth?: false | string[] | undefined;
	/** URL to redirect to after successful sign-in. */
	redirectUrl?: string | undefined;
	/** URL for the sign-up page link. */
	signUpUrl?: string | undefined;
	/** URL for the forgot-password page link. */
	forgotPasswordUrl?: string | undefined;
}

export interface SignUpConfig extends StyleProps, CallbackProps {
	/** Enable email + password sign-up (default: true). */
	emailAndPassword?: boolean | undefined;
	/** Show username field (requires username plugin). */
	username?: boolean | undefined;
	/** Show name field (default: true). */
	name?: boolean | undefined;
	/** OAuth providers to display. */
	oauth?: false | string[] | undefined;
	/** URL to redirect to after successful sign-up. */
	redirectUrl?: string | undefined;
	/** URL for the sign-in page link. */
	signInUrl?: string | undefined;
}

export interface ForgotPasswordConfig extends StyleProps, CallbackProps {
	/** URL the reset link in the email will point to. */
	redirectUrl?: string | undefined;
	/** URL for the back-to-sign-in link. */
	signInUrl?: string | undefined;
}

export interface ResetPasswordConfig extends StyleProps, CallbackProps {
	/** Reset token. Auto-extracted from URL search params if not provided. */
	token?: string | undefined;
	/** URL to redirect to after successful password reset. */
	redirectUrl?: string | undefined;
}

export interface AuthRouterConfig extends StyleProps {
	/** Current pathname used to determine which component to render. */
	path: string;
	/** Path that maps to the SignIn component (default: "/sign-in"). */
	signInPath?: string | undefined;
	/** Path that maps to the SignUp component (default: "/sign-up"). */
	signUpPath?: string | undefined;
	/** Path that maps to the ForgotPassword component (default: "/forgot-password"). */
	forgotPasswordPath?: string | undefined;
	/** Path that maps to the ResetPassword component (default: "/reset-password"). */
	resetPasswordPath?: string | undefined;
	/** Which component to show when no path matches (default: "sign-in"). */
	fallback?: "sign-in" | "sign-up" | undefined;
	/** Props forwarded to the SignIn component. */
	signIn?: Omit<SignInConfig, keyof StyleProps> | undefined;
	/** Props forwarded to the SignUp component. */
	signUp?: Omit<SignUpConfig, keyof StyleProps> | undefined;
	/** Props forwarded to the ForgotPassword component. */
	forgotPassword?: Omit<ForgotPasswordConfig, keyof StyleProps> | undefined;
	/** Props forwarded to the ResetPassword component. */
	resetPassword?: Omit<ResetPasswordConfig, keyof StyleProps> | undefined;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface ButtonTheme {
	primary: string;
	social: string;
	link: string;
}

export interface Theme {
	card: string;
	cardHeader: string;
	cardTitle: string;
	cardDescription: string;
	cardContent: string;
	cardFooter: string;
	input: string;
	label: string;
	button: ButtonTheme;
	error: string;
	divider: string;
	dividerText: string;
	link: string;
	socialButtonsContainer: string;
	formField: string;
}

// ---------------------------------------------------------------------------
// Labels / i18n
// ---------------------------------------------------------------------------

export interface SignInLabels {
	title: string;
	email: string;
	password: string;
	username: string;
	submit: string;
	submitting: string;
	forgotPassword: string;
	noAccount: string;
	signUp: string;
	orContinueWith: string;
	rememberMe: string;
	magicLink: string;
	magicLinkSent: string;
	passkey: string;
	phoneNumber: string;
	emailOtp: string;
	emailOtpSent: string;
}

export interface SignUpLabels {
	title: string;
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
	username: string;
	submit: string;
	submitting: string;
	hasAccount: string;
	signIn: string;
	orContinueWith: string;
}

export interface ForgotPasswordLabels {
	title: string;
	description: string;
	email: string;
	submit: string;
	submitting: string;
	backToSignIn: string;
	successMessage: string;
}

export interface ResetPasswordLabels {
	title: string;
	password: string;
	confirmPassword: string;
	submit: string;
	submitting: string;
	successMessage: string;
	backToSignIn: string;
}

export interface TwoFactorLabels {
	title: string;
	description: string;
	totpCode: string;
	otpCode: string;
	backupCode: string;
	submit: string;
	submitting: string;
	sendOtp: string;
	sendingOtp: string;
	useBackupCode: string;
	useTotp: string;
	useOtp: string;
}

export interface Labels {
	signIn: SignInLabels;
	signUp: SignUpLabels;
	forgotPassword: ForgotPasswordLabels;
	resetPassword: ResetPasswordLabels;
	twoFactor: TwoFactorLabels;
}

// ---------------------------------------------------------------------------
// Auth flow state
// ---------------------------------------------------------------------------

export type AuthFlowStep =
	| "idle"
	| "submitting"
	| "success"
	| "error"
	| "two-factor";

export interface AuthFlowState {
	step: AuthFlowStep;
	error: AuthUIError | null;
	/** Available two-factor methods when step is "two-factor". */
	twoFactorMethods?: string[] | undefined;
}

// ---------------------------------------------------------------------------
// Provider context (framework packages wrap this)
// ---------------------------------------------------------------------------

export interface AuthUIConfig {
	locale?: string | undefined;
	theme?: Partial<Theme> | undefined;
	labels?: Partial<Labels> | undefined;
}

// ---------------------------------------------------------------------------
// OAuth provider metadata
// ---------------------------------------------------------------------------

export interface OAuthProviderMeta {
	id: string;
	name: string;
	icon: string;
}
