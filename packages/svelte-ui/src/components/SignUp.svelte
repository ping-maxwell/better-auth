<script lang="ts">
import type {
	AuthFlowState,
	SignUpConfig,
	SignUpFormData,
} from "@better-auth/ui-core";
import {
	buildSignUpBody,
	createInitialSignUpState,
	createSignUpFormData,
	mergeTheme,
	processSignUpResponse,
	resolveLabels,
	toAuthUIError,
	validateSignUpForm,
} from "@better-auth/ui-core";
import { getAuthUIContext } from "../context";

interface Props extends SignUpConfig {}

let {
	emailAndPassword = true,
	username = false,
	name: showName = true,
	oauth = undefined,
	redirectUrl = undefined,
	signInUrl = "/sign-in",
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
const _labels = $derived(allLabels.signUp);
const client = ctx.client;

let formData = $state<SignUpFormData>(createSignUpFormData());
let _flowState = $state<AuthFlowState>(createInitialSignUpState());
let _fieldError = $state("");

const _showDivider = $derived(
	emailAndPassword && oauth && Array.isArray(oauth) && oauth.length > 0,
);

const _cardClass = $derived(`${theme.card}${className ? ` ${className}` : ""}`);

async function _handleSubmit(e: SubmitEvent) {
	e.preventDefault();
	_fieldError = "";

	const validationError = validateSignUpForm(formData, {
		showName,
		showUsername: username,
	});
	if (validationError) {
		_fieldError = validationError;
		return;
	}

	_flowState = { step: "submitting", error: null };

	try {
		const signUp = client.signUp as Record<
			string,
			(
				args: Record<string, unknown>,
			) => Promise<{ data?: unknown; error?: unknown }>
		>;
		const fn = signUp?.email;
		if (!fn) {
			_fieldError = "Sign-up is not configured.";
			_flowState = {
				step: "error",
				error: { message: "Sign-up is not configured." },
			};
			return;
		}

		const body = buildSignUpBody(formData, {
			showName,
			showUsername: username,
			redirectUrl,
		});
		const res = await fn(body);
		const newState = processSignUpResponse(res);
		_flowState = newState;

		if (newState.step === "error" && newState.error) {
			_fieldError = newState.error.message;
			onError?.(newState.error);
		} else if (newState.step === "success") {
			onSuccess?.(res.data);
		}
	} catch (err) {
		const uiErr = toAuthUIError(err);
		_flowState = { step: "error", error: uiErr };
		_fieldError = uiErr.message;
		onError?.(uiErr);
	}
}
</script>

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
			<form onsubmit={handleSubmit}>
				<div class={theme.cardContent}>
					{#if showName}
						<FormField
							label={labels.name}
							{theme}
							name="name"
							type="text"
							autocomplete="name"
							value={formData.name}
							oninput={(e) =>
								(formData = {
									...formData,
									name: e.currentTarget.value,
								})}
						/>
					{/if}

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
					{/if}

					<FormField
						label={labels.password}
						{theme}
						name="password"
						type="password"
						autocomplete="new-password"
						value={formData.password}
						oninput={(e) =>
							(formData = {
								...formData,
								password: e.currentTarget.value,
							})}
					/>

					<FormField
						label={labels.confirmPassword}
						{theme}
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						value={formData.confirmPassword}
						oninput={(e) =>
							(formData = {
								...formData,
								confirmPassword: e.currentTarget.value,
							})}
					/>

					{#if fieldError}
						<p class={theme.error}>{fieldError}</p>
					{/if}

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
	</div>

	<div class={theme.cardFooter}>
		<span>{labels.hasAccount} </span>
		<a href={signInUrl} class={theme.link}>
			{labels.signIn}
		</a>
	</div>
</div>
