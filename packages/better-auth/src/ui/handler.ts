import type { AuthContext, BetterAuthOptions, UIPage } from "@better-auth/core";
import type { SocialProvider } from "@better-auth/ui";
import {
	getForgotPasswordPage,
	getProfilePage,
	getResetPasswordPage,
	getSignInPage,
	getSignUpPage,
	getVerifyEmailPage,
} from "@better-auth/ui";

export type UIHandlerOptions = {
	context: Promise<AuthContext>;
	options: BetterAuthOptions;
};

/**
 * Collect UI pages from all plugins
 */
function collectPluginPages(options: BetterAuthOptions): UIPage[] {
	const pages: UIPage[] = [];

	if (options.plugins) {
		for (const plugin of options.plugins) {
			if (plugin.ui?.pages) {
				pages.push(...plugin.ui.pages);
			}
		}
	}

	return pages;
}

/**
 * Create a 404 Not Found response
 */
function notFoundResponse(): Response {
	return new Response("Not Found", {
		status: 404,
		headers: {
			"Content-Type": "text/plain",
		},
	});
}

/**
 * Create an HTML response
 */
function htmlResponse(html: string): Response {
	return new Response(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

/**
 * Normalize a path by removing trailing slashes and ensuring leading slash
 */
function normalizePath(path: string): string {
	let normalized = path;
	if (!normalized.startsWith("/")) {
		normalized = "/" + normalized;
	}
	if (normalized.length > 1 && normalized.endsWith("/")) {
		normalized = normalized.slice(0, -1);
	}
	return normalized;
}

/**
 * Get social providers from auth options
 */
function getSocialProviders(options: BetterAuthOptions): SocialProvider[] {
	const providers: SocialProvider[] = [];

	if (options.socialProviders) {
		for (const [id, config] of Object.entries(options.socialProviders)) {
			if (config) {
				const name = id.charAt(0).toUpperCase() + id.slice(1);
				providers.push({ id, name });
			}
		}
	}

	return providers;
}

/**
 * Create the UI handler for serving auth pages
 */
export function createUIHandler({ context, options }: UIHandlerOptions) {
	const uiOptions = options.ui;

	if (!uiOptions || uiOptions.enabled === false) {
		return async (_request: Request): Promise<Response> => {
			return notFoundResponse();
		};
	}

	const pluginPages = collectPluginPages(options);
	const basePath = normalizePath(uiOptions.basePath ?? "/auth");

	const pluginPageMap = new Map<string, UIPage>();
	for (const page of pluginPages) {
		const fullPath = normalizePath(basePath + normalizePath(page.path));
		pluginPageMap.set(fullPath, page);
	}

	const customPageMap = new Map<string, UIPage>();
	if (uiOptions.customPages) {
		for (const page of uiOptions.customPages) {
			const fullPath = normalizePath(basePath + normalizePath(page.path));
			customPageMap.set(fullPath, page);
		}
	}

	return async (request: Request): Promise<Response> => {
		if (request.method !== "GET") {
			return new Response("Method Not Allowed", {
				status: 405,
				headers: {
					"Content-Type": "text/plain",
					Allow: "GET",
				},
			});
		}

		const ctx = await context;
		const url = new URL(request.url);
		const pathname = normalizePath(url.pathname);

		const apiBaseUrl =
			uiOptions.apiBaseUrl || `${ctx.baseURL}${ctx.options.basePath || ""}`;

		const baseOptions = {
			appName: uiOptions.theme?.appName || ctx.appName,
			logo: uiOptions.theme?.logo,
			apiBaseUrl,
			theme: uiOptions.theme,
			socialProviders: getSocialProviders(options),
			redirectTo: uiOptions.redirectTo,
		};

		if (customPageMap.has(pathname)) {
			const page = customPageMap.get(pathname)!;
			return htmlResponse(page.html);
		}

		if (pluginPageMap.has(pathname)) {
			const page = pluginPageMap.get(pathname)!;
			return htmlResponse(page.html);
		}

		const relativePath = basePath
			? pathname.replace(basePath, "") || "/"
			: pathname;

		const pages = uiOptions.pages || {};

		switch (relativePath) {
			case "/sign-in":
				if (pages.signIn?.enabled === false) return notFoundResponse();
				return htmlResponse(
					getSignInPage({
						...baseOptions,
						emailPassword: options.emailAndPassword?.enabled !== false,
						passkey: !!options.plugins?.some((p) => p.id === "passkey"),
						signUpUrl: `${basePath}/sign-up`,
						forgotPasswordUrl: `${basePath}/forgot-password`,
					}),
				);

			case "/sign-up":
				if (pages.signUp?.enabled === false) return notFoundResponse();
				return htmlResponse(
					getSignUpPage({
						...baseOptions,
						emailPassword: options.emailAndPassword?.enabled !== false,
						requireEmailVerification:
							options.emailVerification?.sendOnSignUp ?? false,
						signInUrl: `${basePath}/sign-in`,
					}),
				);

			case "/forgot-password":
				if (pages.forgotPassword?.enabled === false) return notFoundResponse();
				return htmlResponse(
					getForgotPasswordPage({
						...baseOptions,
						signInUrl: `${basePath}/sign-in`,
					}),
				);

			case "/reset-password":
				if (pages.resetPassword?.enabled === false) return notFoundResponse();
				return htmlResponse(
					getResetPasswordPage({
						...baseOptions,
						signInUrl: `${basePath}/sign-in`,
					}),
				);

			case "/verify-email":
				if (pages.verifyEmail?.enabled === false) return notFoundResponse();
				return htmlResponse(
					getVerifyEmailPage({
						...baseOptions,
						signInUrl: `${basePath}/sign-in`,
					}),
				);

			case "/profile":
				if (pages.profile?.enabled === false) return notFoundResponse();
				return htmlResponse(
					getProfilePage({
						...baseOptions,
						signInUrl: `${basePath}/sign-in`,
					}),
				);

			default:
				return notFoundResponse();
		}
	};
}
