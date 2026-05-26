import type {
	AuthUIConfig,
	Labels,
	LocaleMap,
	Theme,
} from "@better-auth/ui-core";
import { mergeTheme, resolveLabels } from "@better-auth/ui-core";
import type { InjectionKey } from "vue";
import { inject, provide } from "vue";

export interface AuthUIContextValue {
	/** The better-auth client instance created via `createAuthClient`. */
	client: Record<string, unknown>;
	theme: Theme;
	labels: Labels;
	locale: string;
}

const AUTH_UI_KEY: InjectionKey<AuthUIContextValue> = Symbol("better-auth-ui");

/**
 * Provide auth UI context to descendant components.
 * Call this in a parent component's `setup()`.
 *
 * @example
 * ```ts
 * setup() {
 *   provideAuthUI(authClient, { locale: "en" });
 * }
 * ```
 */
export function provideAuthUI(
	client: Record<string, unknown>,
	config: AuthUIConfig & { locales?: LocaleMap } = {},
): void {
	const locale = config.locale ?? "en";
	const value: AuthUIContextValue = {
		client,
		theme: mergeTheme(config.theme),
		labels: resolveLabels(locale, config.locales, config.labels),
		locale,
	};
	provide(AUTH_UI_KEY, value);
}

/**
 * Read the auth UI context. Throws if used outside a component that called `provideAuthUI`.
 */
export function useAuthUI(): AuthUIContextValue {
	const ctx = inject(AUTH_UI_KEY);
	if (!ctx) {
		throw new Error(
			"useAuthUI must be used within a component that calls provideAuthUI(). " +
				"Wrap your component tree with a parent that calls provideAuthUI(client).",
		);
	}
	return ctx;
}
