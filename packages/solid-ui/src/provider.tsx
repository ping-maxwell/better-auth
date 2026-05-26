// cspell:ignore Connexion
import type {
	AuthUIConfig,
	Labels,
	LocaleMap,
	Theme,
} from "@better-auth/ui-core";
import { mergeTheme, resolveLabels } from "@better-auth/ui-core";
import type { JSX } from "solid-js";
import { createContext, createMemo, useContext } from "solid-js";

export interface AuthUIContextValue {
	/** The better-auth client instance created via `createAuthClient`. */
	client: Record<string, unknown>;
	theme: Theme;
	labels: Labels;
	locale: string;
}

const AuthUIContext = createContext<AuthUIContextValue>();

export interface AuthUIProviderProps extends AuthUIConfig {
	/**
	 * The auth client created via `createAuthClient` from `better-auth/solid`.
	 */
	client: Record<string, unknown>;
	/**
	 * Additional locale translation dictionaries.
	 * Keyed by locale code (e.g. `{ fr: { signIn: { title: "Connexion" } } }`).
	 */
	locales?: LocaleMap | undefined;
	children: JSX.Element;
}

/**
 * Provides auth client, theme, and i18n context to all Better Auth UI components.
 *
 * @example
 * ```tsx
 * import { createAuthClient } from "better-auth/solid"
 * import { AuthUIProvider } from "@better-auth/solid-ui"
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
export function AuthUIProvider(props: AuthUIProviderProps) {
	const value = createMemo(() => {
		const locale = props.locale ?? "en";
		return {
			client: props.client,
			theme: mergeTheme(props.theme),
			labels: resolveLabels(locale, props.locales, props.labels),
			locale,
		};
	});

	return (
		<AuthUIContext.Provider value={value()}>
			{props.children}
		</AuthUIContext.Provider>
	);
}

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
