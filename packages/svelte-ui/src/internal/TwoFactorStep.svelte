<script lang="ts">
import type { AuthUIError, Theme, TwoFactorLabels } from "@better-auth/ui-core";
import { toAuthUIError, validateTwoFactorCode } from "@better-auth/ui-core";

type TwoFactorMethod = "totp" | "otp" | "backup";

interface Props {
	methods: string[];
	theme: Theme;
	labels: TwoFactorLabels;
	client: Record<string, unknown>;
	onSuccess?: ((data: unknown) => void) | undefined;
	onError?: ((error: AuthUIError) => void) | undefined;
}

let { methods, theme, labels, client, onSuccess, onError }: Props = $props();

const availableMethods = $derived(
	(methods.length > 0 ? methods : ["totp"]) as TwoFactorMethod[],
);

let activeMethod = $state<TwoFactorMethod>("totp");
let code = $state("");
let _fieldError = $state("");
let _submitting = $state(false);
let _otpSent = $state(false);

$effect(() => {
	if (availableMethods.length > 0 && availableMethods[0]) {
		activeMethod = availableMethods[0];
	}
});

const twoFactor = $derived(
	(client.twoFactor ?? {}) as Record<
		string,
		(
			args: Record<string, unknown>,
		) => Promise<{ data?: unknown; error?: unknown }>
	>,
);

const _codeLabel = $derived(
	activeMethod === "totp"
		? labels.totpCode
		: activeMethod === "otp"
			? labels.otpCode
			: labels.backupCode,
);

const _otherMethods = $derived(
	availableMethods.filter((m) => m !== activeMethod),
);

async function _handleVerify(e: SubmitEvent) {
	e.preventDefault();
	_fieldError = "";

	const validationError = validateTwoFactorCode(code, activeMethod);
	if (validationError) {
		_fieldError = validationError;
		return;
	}

	_submitting = true;
	try {
		let verifyFn:
			| ((
					args: Record<string, unknown>,
			  ) => Promise<{ data?: unknown; error?: unknown }>)
			| undefined;
		if (activeMethod === "totp") verifyFn = twoFactor.verifyTotp;
		else if (activeMethod === "otp") verifyFn = twoFactor.verifyOtp;
		else verifyFn = twoFactor.verifyBackupCode;

		if (!verifyFn) {
			_fieldError = "Two-factor verification is not configured.";
			_submitting = false;
			return;
		}

		const res = await verifyFn({ code });
		if (res.error) {
			const err = toAuthUIError(res.error);
			_fieldError = err.message;
			onError?.(err);
		} else {
			onSuccess?.(res.data);
		}
	} catch (err) {
		const uiErr = toAuthUIError(err);
		_fieldError = uiErr.message;
		onError?.(uiErr);
	} finally {
		_submitting = false;
	}
}

async function _handleSendOtp() {
	try {
		const sendFn = twoFactor.sendOtp;
		if (sendFn) {
			await sendFn({});
			_otpSent = true;
		}
	} catch {
		/* best-effort */
	}
}

function _switchMethod(m: TwoFactorMethod) {
	activeMethod = m;
	code = "";
	_fieldError = "";
}

function _methodLabel(m: TwoFactorMethod): string {
	if (m === "totp") return labels.useTotp;
	if (m === "otp") return labels.useOtp;
	return labels.useBackupCode;
}
</script>

<div>
	<div class={theme.cardHeader}>
		<h2 class={theme.cardTitle}>{labels.title}</h2>
		<p class={theme.cardDescription}>{labels.description}</p>
	</div>

	<form onsubmit={handleVerify} class={theme.cardContent}>
		{#if activeMethod === "otp" && !otpSent}
			<button
				type="button"
				class={theme.button.primary}
				onclick={handleSendOtp}
			>
				{labels.sendOtp}
			</button>
		{/if}

		<FormField
			label={codeLabel}
			error={fieldError}
			{theme}
			name="code"
			type="text"
			autocomplete="one-time-code"
			inputmode={activeMethod === "backup" ? "text" : "numeric"}
			value={code}
			placeholder={activeMethod === "backup" ? "XXXX-XXXX" : "000000"}
			oninput={(e) => (code = e.currentTarget.value)}
		/>

		<button type="submit" class={theme.button.primary} disabled={submitting}>
			{submitting ? labels.submitting : labels.submit}
		</button>
	</form>

	{#if availableMethods.length > 1}
		<div class={theme.cardFooter}>
			{#each otherMethods as m (m)}
				<button
					type="button"
					class={theme.button.link}
					onclick={() => switchMethod(m)}
				>
					{methodLabel(m)}
				</button>
			{/each}
		</div>
	{/if}
</div>
