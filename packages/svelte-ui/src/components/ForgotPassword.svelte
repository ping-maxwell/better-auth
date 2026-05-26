<script lang="ts">
import type {
	AuthFlowState,
	ForgotPasswordConfig,
	ForgotPasswordFormData,
} from "@better-auth/ui-core";
import {
	buildForgotPasswordBody,
	createForgotPasswordFormData,
	createInitialForgotPasswordState,
	mergeTheme,
	processForgotPasswordResponse,
	resolveLabels,
	toAuthUIError,
	validateForgotPasswordForm,
} from "@better-auth/ui-core";
import { getAuthUIContext } from "../context";

interface Props extends ForgotPasswordConfig {}

let {
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
const _labels = $derived(allLabels.forgotPassword);
const client = ctx.client;

let formData = $state<ForgotPasswordFormData>(createForgotPasswordFormData());
let _flowState = $state<AuthFlowState>(createInitialForgotPasswordState());
let _fieldError = $state("");

const _cardClass = $derived(`${theme.card}${className ? ` ${className}` : ""}`);

async function _handleSubmit(e: SubmitEvent) {
	e.preventDefault();
	_fieldError = "";

	const validationError = validateForgotPasswordForm(formData);
	if (validationError) {
		_fieldError = validationError;
		return;
	}

	_flowState = { step: "submitting", error: null };

	try {
		const fn = client.requestPasswordReset as
			| ((
					args: Record<string, unknown>,
			  ) => Promise<{ data?: unknown; error?: unknown }>)
			| undefined;

		if (!fn) {
			_fieldError = "Password reset is not configured.";
			_flowState = {
				step: "error",
				error: { message: "Password reset is not configured." },
			};
			return;
		}

		const body = buildForgotPasswordBody(formData, redirectUrl);
		const res = await fn(body);
		const newState = processForgotPasswordResponse(res);
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

{#if flowState.step === "success"}
	<div class={cardClass} {style}>
		<div class={theme.cardHeader}>
			<h2 class={theme.cardTitle}>{labels.title}</h2>
			<p class={theme.cardDescription}>{labels.successMessage}</p>
		</div>
		<div class={theme.cardFooter}>
			<a href={signInUrl} class={theme.link}>
				{labels.backToSignIn}
			</a>
		</div>
	</div>
{:else}
	<div class={cardClass} {style}>
		<div class={theme.cardHeader}>
			<h2 class={theme.cardTitle}>{labels.title}</h2>
			<p class={theme.cardDescription}>{labels.description}</p>
		</div>

		<form onsubmit={handleSubmit}>
			<div class={theme.cardContent}>
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

		<div class={theme.cardFooter}>
			<a href={signInUrl} class={theme.link}>
				{labels.backToSignIn}
			</a>
		</div>
	</div>
{/if}
