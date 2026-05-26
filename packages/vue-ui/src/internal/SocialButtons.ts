import type { Theme } from "@better-auth/ui-core";
import { getProvidersMeta } from "@better-auth/ui-core";
import type { PropType } from "vue";
import { defineComponent, h } from "vue";

export const SocialButtons = defineComponent({
	name: "SocialButtons",
	props: {
		providers: { type: Array as PropType<string[]>, required: true },
		theme: { type: Object as PropType<Theme>, required: true },
		redirectUrl: { type: String, default: undefined },
		client: {
			type: Object as PropType<Record<string, unknown>>,
			required: true,
		},
	},
	emits: ["error"],
	setup(props, { emit }) {
		const handleSocialSignIn = async (providerId: string) => {
			try {
				const signIn = props.client.signIn as Record<string, unknown>;
				const socialFn = signIn?.social as
					| ((args: Record<string, unknown>) => Promise<unknown>)
					| undefined;
				if (!socialFn) {
					console.error(
						"[better-auth/vue-ui] client.signIn.social is not available.",
					);
					return;
				}
				const body: Record<string, unknown> = { provider: providerId };
				if (props.redirectUrl) body.callbackURL = props.redirectUrl;
				await socialFn(body);
			} catch (err) {
				emit("error", err);
			}
		};

		return () => {
			const meta = getProvidersMeta(props.providers);
			if (meta.length === 0) return null;

			return h(
				"div",
				{ class: props.theme.socialButtonsContainer },
				meta.map((provider) =>
					h(
						"button",
						{
							key: provider.id,
							type: "button",
							class: props.theme.button.social,
							onClick: () => handleSocialSignIn(provider.id),
						},
						[
							h("span", {
								innerHTML: provider.icon,
								style: {
									width: "20px",
									height: "20px",
									display: "inline-flex",
								},
								"aria-hidden": "true",
							}),
							provider.name,
						],
					),
				),
			);
		};
	},
});
