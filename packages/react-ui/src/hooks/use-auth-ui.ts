import type {
	AuthUIConfig,
	Labels,
	LocaleMap,
	Theme,
} from "@better-auth/ui-core";
import { mergeTheme, resolveLabels } from "@better-auth/ui-core";
import { createContext, useContext } from "react";

export interface AuthUIContextValue {
	/** The better-auth client instance created via `createAuthClient`. */
	client: Record<string, unknown>;
	theme: Theme;
	labels: Labels;
	locale: string;
}

export const AuthUIContext = createContext<AuthUIContextValue | null>(null);

/**
 * Read the auth UI context. Throws if used outside an `<AuthUIProvider>`.
 */
export function useAuthUI(): AuthUIContextValue {
	const ctx = useContext(AuthUIContext);
	if (!ctx) {
		throw new Error(
			"useAuthUI must be used within an <AuthUIProvider>. " +
				"Wrap your component tree with <AuthUIProvider client={authClient}>.",
		);
	}
	return ctx;
}

/**
 * Build an `AuthUIContextValue` from user-supplied config.
 * Used internally by the provider.
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
