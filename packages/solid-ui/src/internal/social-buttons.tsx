import type { Theme } from "@better-auth/ui-core";
import { getProvidersMeta } from "@better-auth/ui-core";
import { For, Show } from "solid-js";

interface SocialButtonsProps {
	providers: string[];
	theme: Theme;
	redirectUrl?: string | undefined;
	onError?: ((error: unknown) => void) | undefined;
	client: Record<string, unknown>;
}

export function SocialButtons(props: SocialButtonsProps) {
	const meta = () => getProvidersMeta(props.providers);

	const handleSocialSignIn = async (providerId: string) => {
		try {
			const signIn = props.client.signIn as Record<string, unknown>;
			const socialFn = signIn?.social as
				| ((args: Record<string, unknown>) => Promise<unknown>)
				| undefined;
			if (!socialFn) {
				console.error(
					"[better-auth/solid-ui] client.signIn.social is not available.",
				);
				return;
			}
			const body: Record<string, unknown> = { provider: providerId };
			if (props.redirectUrl) body.callbackURL = props.redirectUrl;
			await socialFn(body);
		} catch (err) {
			props.onError?.(err);
		}
	};

	return (
		<Show when={meta().length > 0}>
			<div class={props.theme.socialButtonsContainer}>
				<For each={meta()}>
					{(provider) => (
						<button
							type="button"
							class={props.theme.button.social}
							onClick={() => handleSocialSignIn(provider.id)}
						>
							<span
								innerHTML={provider.icon}
								style={{
									width: "20px",
									height: "20px",
									display: "inline-flex",
								}}
								aria-hidden="true"
							/>
							{provider.name}
						</button>
					)}
				</For>
			</div>
		</Show>
	);
}
