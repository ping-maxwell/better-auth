<script lang="ts">
import type { Theme } from "@better-auth/ui-core";
import { getProvidersMeta } from "@better-auth/ui-core";

interface Props {
	providers: string[];
	theme: Theme;
	redirectUrl?: string | undefined;
	onError?: ((error: unknown) => void) | undefined;
	client: Record<string, unknown>;
}

let { providers, theme, redirectUrl, onError, client }: Props = $props();

const _meta = $derived(getProvidersMeta(providers));

async function _handleSocialSignIn(providerId: string) {
	try {
		const signIn = client.signIn as Record<string, unknown>;
		const socialFn = signIn?.social as
			| ((args: Record<string, unknown>) => Promise<unknown>)
			| undefined;
		if (!socialFn) {
			console.error(
				"[better-auth/svelte-ui] client.signIn.social is not available.",
			);
			return;
		}
		const body: Record<string, unknown> = { provider: providerId };
		if (redirectUrl) body.callbackURL = redirectUrl;
		await socialFn(body);
	} catch (err) {
		onError?.(err);
	}
}
</script>

{#if meta.length > 0}
	<div class={theme.socialButtonsContainer}>
		{#each meta as provider (provider.id)}
			<button
				type="button"
				class={theme.button.social}
				onclick={() => handleSocialSignIn(provider.id)}
			>
				<span
					style="width: 20px; height: 20px; display: inline-flex;"
					aria-hidden="true"
				>
					{@html provider.icon}
				</span>
				{provider.name}
			</button>
		{/each}
	</div>
{/if}
