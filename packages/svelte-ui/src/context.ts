import type {
	AuthUIConfig,
	Labels,
	LocaleMap,
	Theme,
} from "@better-auth/ui-core";
import { mergeTheme, resolveLabels } from "@better-auth/ui-core";
import { getContext, setContext } from "svelte";

const AUTH_UI_KEY = Symbol("better-auth-ui");

export interface AuthUIContextValue {
	/** The better-auth client instance created via `createAuthClient`. */
	client: Record<string, unknown>;
	theme: Theme;
	labels: Labels;
	locale: string;
}

/**
 * Build an `AuthUIContextValue` from user-supplied config.
 * Useful when constructing the value outside of `setAuthUIContext`.
 */
export function buildContextValue(
	client: Record<string, unknown>,
	config: AuthUIConfig & { locales?: LocaleMap },
): AuthUIContextValue {
	const locale = config.locale ?? "en";
	return {
		client,
		theme: mergeTheme(config.theme),
		labels: resolveLabels(locale, config.locales, config.labels),
		locale,
	};
}

/**
 * Provide the auth UI context to child components.
 * Must be called during component initialization (e.g. in a layout or root component).
 *
 * @example
 * ```svelte
 * <script>
 *   import { setAuthUIContext } from "@better-auth/svelte-ui";
 *   import { client } from "$lib/auth";
 *
 *   setAuthUIContext(client, { locale: "en" });
 * </script>
 *
 * <slot />
 * ```
 */
export function setAuthUIContext(
	client: Record<string, unknown>,
	config: AuthUIConfig & { locales?: LocaleMap } = {},
): AuthUIContextValue {
	const value = buildContextValue(client, config);
	setContext(AUTH_UI_KEY, value);
	return value;
}

/**
 * Read the auth UI context. Throws if called outside a component tree
 * where `setAuthUIContext` was used.
 */
export function getAuthUIContext(): AuthUIContextValue {
	const ctx = getContext<AuthUIContextValue>(AUTH_UI_KEY);
	if (!ctx) {
		throw new Error(
			"Auth UI context not found. " +
				"Call setAuthUIContext() in a parent component before using auth UI components.",
		);
	}
	return ctx;
}
