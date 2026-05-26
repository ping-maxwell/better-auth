<script lang="ts">
import type {
	AuthFlowState,
	ResetPasswordConfig,
	ResetPasswordFormData,
} from "@better-auth/ui-core";
import {
	buildResetPasswordBody,
	createInitialResetPasswordState,
	createResetPasswordFormData,
	mergeTheme,
	processResetPasswordResponse,
	resolveLabels,
	toAuthUIError,
	validateResetPasswordForm,
} from "@better-auth/ui-core";
import { getAuthUIContext } from "../context";

interface Props extends ResetPasswordConfig {}

let {
	token: tokenProp = undefined,
	redirectUrl = undefined,
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
const _labels = $derived(allLabels.resetPassword);
const client = ctx.client;

const token = $derived.by(() => {
	if (tokenProp) return tokenProp;
	if (typeof window !== "undefined") {
		const params = new URLSearchParams(window.location.search);
		return params.get("token") ?? undefined;
	}
	return undefined;
});

let formData = $state<ResetPasswordFormData>(createResetPasswordFormData());
let _flowState = $state<AuthFlowState>(createInitialResetPasswordState());
let _fieldError = $state("");

const _cardClass = $derived(`${theme.card}${className ? ` ${className}` : ""}`);

async function _handleSubmit(e: SubmitEvent) {
	e.preventDefault();
	_fieldError = "";

	if (!token) {
		_fieldError = "Missing reset token. Please use the link from your email.";
		return;
	}

	const validationError = validateResetPasswordForm(formData);
	if (validationError) {
		_fieldError = validationError;
		return;
	}

	_flowState = { step: "submitting", error: null };

	try {
		const fn = client.resetPassword as
			| ((
					body: Record<string, unknown>,
					opts?: Record<string, unknown>,
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

		const body = buildResetPasswordBody(formData, token);
		const res = await fn(body);
		const newState = processResetPasswordResponse(res);
		_flowState = newState;

		if (newState.step === "error" && newState.error) {
			_fieldError = newState.error.message;
			onError?.(newState.error);
		} else if (newState.step === "success") {
			onSuccess?.(res.data);
			if (redirectUrl && typeof window !== "undefined") {
				window.location.href = redirectUrl;
			}
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
			<a href={redirectUrl ?? "/sign-in"} class={theme.link}>
				{labels.backToSignIn}
			</a>
		</div>
	</div>
{:else}
	<div class={cardClass} {style}>
		<div class={theme.cardHeader}>
			<h2 class={theme.cardTitle}>{labels.title}</h2>
		</div>

		<form onsubmit={handleSubmit}>
			<div class={theme.cardContent}>
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
	</div>
{/if}
