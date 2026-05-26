import type { Theme } from "@better-auth/ui-core";
import { getProvidersMeta } from "@better-auth/ui-core";
import { useCallback } from "react";

interface SocialButtonsProps {
	providers: string[];
	theme: Theme;
	redirectUrl?: string | undefined;
	onError?: ((error: unknown) => void) | undefined;
	client: Record<string, unknown>;
}

export function SocialButtons({
	providers,
	theme,
	redirectUrl,
	onError,
	client,
}: SocialButtonsProps) {
	const meta = getProvidersMeta(providers);

	const handleSocialSignIn = useCallback(
		async (providerId: string) => {
			try {
				const signIn = client.signIn as Record<string, unknown>;
				const socialFn = signIn?.social as
					| ((args: Record<string, unknown>) => Promise<unknown>)
					| undefined;
				if (!socialFn) {
					console.error(
						"[better-auth/react-ui] client.signIn.social is not available.",
					);
					return;
				}
				const body: Record<string, unknown> = { provider: providerId };
				if (redirectUrl) body.callbackURL = redirectUrl;
				await socialFn(body);
			} catch (err) {
				onError?.(err);
			}
		},
		[client, redirectUrl, onError],
	);

	if (meta.length === 0) return null;

	return (
		<div className={theme.socialButtonsContainer}>
			{meta.map((provider) => (
				<button
					key={provider.id}
					type="button"
					className={theme.button.social}
					onClick={() => handleSocialSignIn(provider.id)}
				>
					<span
						dangerouslySetInnerHTML={{ __html: provider.icon }}
						style={{ width: 20, height: 20, display: "inline-flex" }}
						aria-hidden="true"
					/>
					{provider.name}
				</button>
			))}
		</div>
	);
}
