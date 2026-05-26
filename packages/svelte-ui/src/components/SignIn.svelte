<script lang="ts">
import type {
	AuthFlowState,
	SignInConfig,
	SignInFormData,
} from "@better-auth/ui-core";
import {
	buildEmailSignInBody,
	buildUsernameSignInBody,
	createInitialSignInState,
	createSignInFormData,
	mergeTheme,
	processSignInResponse,
	resolveLabels,
	toAuthUIError,
	validateSignInForm,
} from "@better-auth/ui-core";
import { getAuthUIContext } from "../context";

interface Props extends SignInConfig {}

let {
	emailAndPassword = true,
	username = false,
	passkey = false,
	twoFactor = false,
	magicLink = false,
	phoneNumber = false,
	emailOtp = false,
	oauth = undefined,
	redirectUrl = undefined,
	signUpUrl = "/sign-up",
	forgotPasswordUrl = "/forgot-password",
	onSuccess = undefined,
	onError = undefined,
	className = undefined,
	style = undefined,
	theme: themeOverride = undefined,
	labels: labelsOverride = undefined,
}: Props = $props();

const ctx = getAuthUIContext();

const theme = $derived(
	themeOverride ? mergeTheme({ ...ctx.theme, ...themeOverride }) : ctx.theme,
);
const allLabels = $derived(
	labelsOverride
		? resolveLabels(ctx.locale, undefined, {
				...ctx.labels,
				...labelsOverride,
			})
		: ctx.labels,
);
const labels = $derived(allLabels.signIn);
const client = ctx.client;

let formData = $state<SignInFormData>(createSignInFormData());
let flowState = $state<AuthFlowState>(createInitialSignInState());
let _fieldError = $state("");

const _showDivider = $derived(
	emailAndPassword && oauth && Array.isArray(oauth) && oauth.length > 0,
);

const _cardClass = $derived(`${theme.card}${className ? ` ${className}` : ""}`);

async function _handleEmailSignIn(e: SubmitEvent) {
	e.preventDefault();
	_fieldError = "";

	const mode = username ? "username" : "email";
	const validationError = validateSignInForm(formData, mode);
	if (validationError) {
		_fieldError = validationError;
		return;
	}

	flowState = { step: "submitting", error: null };

	try {
		const signIn = client.signIn as Record<
			string,
			(
				args: Record<string, unknown>,
			) => Promise<{ data?: unknown; error?: unknown }>
		>;

		let res: { data?: unknown; error?: unknown };
		if (username) {
			const fn = signIn.username;
			if (!fn) {
				_fieldError = "Username sign-in is not configured.";
				flowState = {
					step: "error",
					error: { message: "Username sign-in is not configured." },
				};
				return;
			}
			res = await fn(buildUsernameSignInBody(formData, redirectUrl));
		} else {
			const fn = signIn.email;
			if (!fn) {
				_fieldError = "Email sign-in is not configured.";
				flowState = {
					step: "error",
					error: { message: "Email sign-in is not configured." },
				};
				return;
			}
			res = await fn(buildEmailSignInBody(formData, redirectUrl));
		}

		const newState = processSignInResponse(res, flowState);
		flowState = newState;

		if (newState.step === "error" && newState.error) {
			_fieldError = newState.error.message;
			onError?.(newState.error);
		} else if (newState.step === "success") {
			onSuccess?.(res.data);
		}
	} catch (err) {
		const uiErr = toAuthUIError(err);
		flowState = { step: "error", error: uiErr };
		_fieldError = uiErr.message;
		onError?.(uiErr);
	}
}

async function _handlePasskeySignIn() {
	try {
		const signIn = client.signIn as Record<
			string,
			(
				args?: Record<string, unknown>,
			) => Promise<{ data?: unknown; error?: unknown }>
		>;
		const fn = signIn.passkey;
		if (!fn) {
			console.error(
				"[better-auth/svelte-ui] client.signIn.passkey is not available.",
			);
			return;
		}
		const res = await fn();
		if (res.error) {
			onError?.(toAuthUIError(res.error));
		} else {
			onSuccess?.(res.data);
		}
	} catch (err) {
		onError?.(toAuthUIError(err));
	}
}

async function _handleMagicLink() {
	_fieldError = "";
	if (!formData.email) {
		_fieldError = "Please enter your email first.";
		return;
	}

	try {
		const signIn = client.signIn as Record<
			string,
			(
				args: Record<string, unknown>,
			) => Promise<{ data?: unknown; error?: unknown }>
		>;
		const fn = signIn.magicLink;
		if (!fn) {
			_fieldError = "Magic link sign-in is not configured.";
			return;
		}
		const body: Record<string, unknown> = { email: formData.email };
		if (redirectUrl) body.callbackURL = redirectUrl;
		const res = await fn(body);
		if (res.error) {
			_fieldError = toAuthUIError(res.error).message;
		} else {
			flowState = { step: "success", error: null };
			_fieldError = labels.magicLinkSent;
		}
	} catch (err) {
		_fieldError = toAuthUIError(err).message;
	}
}

async function _handleEmailOtp() {
	_fieldError = "";
	if (!formData.email) {
		_fieldError = "Please enter your email first.";
		return;
	}

	try {
		const emailOtpNs = client.emailOtp as
			| Record<
					string,
					(
						args: Record<string, unknown>,
					) => Promise<{ data?: unknown; error?: unknown }>
			  >
			| undefined;
		const fn = emailOtpNs?.sendVerificationOtp;
		if (!fn) {
			_fieldError = "Email OTP is not configured.";
			return;
		}
		const res = await fn({ email: formData.email, type: "sign-in" });
		if (res.error) {
			_fieldError = toAuthUIError(res.error).message;
		} else {
			_fieldError = labels.emailOtpSent;
		}
	} catch (err) {
		_fieldError = toAuthUIError(err).message;
	}
}
</script>

{#if twoFactor && flowState.step === "two-factor"}
	<div class={theme.card} {style}>
		<TwoFactorStep
			methods={flowState.twoFactorMethods ?? []}
			{theme}
			labels={allLabels.twoFactor}
			{client}
			{onSuccess}
			{onError}
		/>
	</div>
{:else}
	<div class={cardClass} {style}>
		<div class={theme.cardHeader}>
			<h2 class={theme.cardTitle}>{labels.title}</h2>
		</div>

		<div class={theme.cardContent}>
			{#if oauth && Array.isArray(oauth) && oauth.length > 0}
				<SocialButtons
					providers={oauth}
					{theme}
					{redirectUrl}
					onError={(err) => onError?.(toAuthUIError(err))}
					{client}
				/>
			{/if}

			{#if showDivider}
				<Divider text={labels.orContinueWith} {theme} />
			{/if}

			{#if emailAndPassword}
				<form onsubmit={handleEmailSignIn}>
					<div class={theme.cardContent}>
						{#if username}
							<FormField
								label={labels.username}
								{theme}
								name="username"
								type="text"
								autocomplete="username"
								value={formData.username}
								oninput={(e) =>
									(formData = {
										...formData,
										username: e.currentTarget.value,
									})}
							/>
						{:else}
							<FormField
								label={labels.email}
								{theme}
								name="email"
								type="email"
								autocomplete="email"
								value={formData.email}
								oninput={(e) =>
									(formData = {
										...formData,
										email: e.currentTarget.value,
									})}
							/>
						{/if}

						<FormField
							label={labels.password}
							{theme}
							name="password"
							type="password"
							autocomplete="current-password"
							value={formData.password}
							oninput={(e) =>
								(formData = {
									...formData,
									password: e.currentTarget.value,
								})}
						/>

						{#if fieldError}
							<p class={theme.error}>{fieldError}</p>
						{/if}

						<div
							style="display: flex; justify-content: space-between; align-items: center;"
						>
							<label
								style="display: flex; align-items: center; gap: 6px;"
							>
								<input
									type="checkbox"
									checked={formData.rememberMe}
									onchange={(e) =>
										(formData = {
											...formData,
											rememberMe: e.currentTarget.checked,
										})}
								/>
								<span class={theme.label}>{labels.rememberMe}</span>
							</label>

							{#if forgotPasswordUrl}
								<a
									href={forgotPasswordUrl}
									class={theme.button.link}
								>
									{labels.forgotPassword}
								</a>
							{/if}
						</div>

						<button
							type="submit"
							class={theme.button.primary}
							disabled={flowState.step === "submitting"}
						>
							{flowState.step === "submitting"
								? labels.submitting
								: labels.submit}
						</button>
					</div>
				</form>
			{/if}

			{#if passkey}
				<button
					type="button"
					class={theme.button.social}
					onclick={handlePasskeySignIn}
				>
					{labels.passkey}
				</button>
			{/if}

			{#if magicLink}
				<button
					type="button"
					class={theme.button.social}
					onclick={handleMagicLink}
				>
					{labels.magicLink}
				</button>
			{/if}

			{#if emailOtp}
				<button
					type="button"
					class={theme.button.social}
					onclick={handleEmailOtp}
				>
					{labels.emailOtp}
				</button>
			{/if}
		</div>

		<div class={theme.cardFooter}>
			<span>{labels.noAccount} </span>
			<a href={signUpUrl} class={theme.link}>
				{labels.signUp}
			</a>
		</div>
	</div>
{/if}
