// cspell:ignore Connexion
import type { AuthUIConfig, LocaleMap } from "@better-auth/ui-core";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { AuthUIContext, buildContextValue } from "./hooks/use-auth-ui";

export interface AuthUIProviderProps extends AuthUIConfig {
	/**
	 * The auth client created via `createAuthClient` from `better-auth/react`.
	 */
	client: Record<string, unknown>;
	/**
	 * Additional locale translation dictionaries.
	 * Keyed by locale code (e.g. `{ fr: { signIn: { title: "Connexion" } } }`).
	 */
	locales?: LocaleMap | undefined;
	children: ReactNode;
}

/**
 * Provides auth client, theme, and i18n context to all Better Auth UI components.
 *
 * @example
 * ```tsx
 * import { createAuthClient } from "better-auth/react"
 * import { AuthUIProvider } from "@better-auth/react-ui"
 *
 * const authClient = createAuthClient({ ... })
 *
 * export default function App() {
 *   return (
 *     <AuthUIProvider client={authClient}>
 *       <Routes />
 *     </AuthUIProvider>
 *   )
 * }
 * ```
 */
export function AuthUIProvider({
	client,
	locale,
	theme,
	labels,
	locales,
	children,
}: AuthUIProviderProps) {
	const value = useMemo(
		() => buildContextValue(client, { locale, theme, labels, locales }),
		[client, locale, theme, labels, locales],
	);

	return (
		<AuthUIContext.Provider value={value}>{children}</AuthUIContext.Provider>
	);
}
