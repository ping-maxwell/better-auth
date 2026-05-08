import type { BetterAuthPlugin } from "@better-auth/core";
import { createAuthMiddleware } from "@better-auth/core/api";
import { setShouldSkipSessionRefresh } from "../api/state/should-session-refresh";
import { parseSetCookieHeader, toCookieOptions } from "../cookies";
import { PACKAGE_VERSION } from "../version";
import { warnIfCookiePluginNotLast } from "./cookie-plugin-guard";

export function toNextJsHandler(
	auth:
		| {
				handler: (request: Request) => Promise<Response>;
		  }
		| ((request: Request) => Promise<Response>),
) {
	const handler = async (request: Request) => {
		return "handler" in auth ? auth.handler(request) : auth(request);
	};
	return {
		GET: handler,
		POST: handler,
		PATCH: handler,
		PUT: handler,
		DELETE: handler,
	};
}

export const nextCookies = () => {
	let hasWarned = false;

	return {
		id: "next-cookies",
		version: PACKAGE_VERSION,
		hooks: {
			before: [
				{
					matcher(ctx) {
						return ctx.path === "/get-session";
					},
					handler: createAuthMiddleware(async (ctx) => {
						if (!hasWarned) {
							warnIfCookiePluginNotLast(ctx.context, "next-cookies");
							hasWarned = true;
						}
						if ("_flag" in ctx && ctx._flag === "router") {
							return;
						}
						let headersStore: Awaited<
							ReturnType<typeof import("next/headers.js").headers>
						>;
						try {
							const { headers } = await import("next/headers.js");
							headersStore = await headers();
						} catch {
							return;
						}
						/**
						 * Skip session refresh for RSC flight requests where the
						 * cookie writes can never reach the client.
						 *
						 * RSC flights carry `RSC: 1` without `next-action`. In
						 * this context cookies().set() either throws, silently
						 * triggers router cache invalidation, or stalls the SSR
						 * stream depending on the Next.js version. Skipping
						 * avoids a DB/cookie mismatch.
						 *
						 * Initial SSR (no `RSC` header) also can't write cookies
						 * from Server Components, but we can't distinguish it
						 * from Route Handler auth.api.* calls here. The after
						 * hook handles that case by gating cookie forwarding on
						 * the `next-action` header.
						 *
						 * Detection uses headers instead of probing
						 * cookies().set(), because the probe unconditionally
						 * triggers Next.js router cache invalidation.
						 *
						 * @see https://github.com/better-auth/better-auth/issues/9360
						 * @see https://github.com/vercel/next.js/blob/8c5af211d580/packages/next/src/server/web/spec-extension/adapters/request-cookies.ts#L112-L157
						 */
						const isRSC = headersStore.get("RSC") === "1";
						const isServerAction = !!headersStore.get("next-action");
						if (isRSC && !isServerAction) {
							await setShouldSkipSessionRefresh(true);
						}
					}),
				},
			],
			after: [
				{
					matcher(ctx) {
						return true;
					},
					handler: createAuthMiddleware(async (ctx) => {
						const returned = ctx.context.responseHeaders;
						if ("_flag" in ctx && ctx._flag === "router") {
							return;
						}
						if (returned instanceof Headers) {
							const setCookies = returned?.get("set-cookie");
							if (!setCookies) return;

							/**
							 * Determine whether cookies().set() is safe in the
							 * current rendering context before attempting writes.
							 *
							 * Only Server Actions (identified by the `next-action`
							 * header) can safely mutate cookies via the Next.js
							 * cookie store. In Server Components — both RSC flight
							 * requests (`RSC: 1`) and initial SSR (no distinguishing
							 * header) — calling cookies().set() can silently trigger
							 * router cache invalidation or stall the SSR streaming
							 * pipeline, depending on the Next.js version.
							 *
							 * HTTP requests through the router (`_flag === "router"`)
							 * are already handled above; they set cookies directly
							 * on the HTTP response.
							 *
							 * @see https://github.com/better-auth/better-auth/issues/9360
							 * @see https://nextjs.org/docs/app/api-reference/functions/cookies
							 */
							let headersStore: Awaited<
								ReturnType<typeof import("next/headers.js").headers>
							>;
							try {
								const { headers } = await import("next/headers.js");
								headersStore = await headers();
							} catch {
								return;
							}
							const isServerAction = !!headersStore.get("next-action");
							if (!isServerAction) {
								return;
							}

							const parsed = parseSetCookieHeader(setCookies);
							let cookieHelper: Awaited<
								ReturnType<typeof import("next/headers.js").cookies>
							>;
							try {
								const { cookies } = await import("next/headers.js");
								cookieHelper = await cookies();
							} catch (error) {
								if (
									error instanceof Error &&
									(error.message.startsWith(
										"`cookies` was called outside a request scope.",
									) ||
										error.message.includes("Cannot find module"))
								) {
									// Monorepo workspaces outside of Next.js hit this path.
									// @see https://nextjs.org/docs/messages/next-dynamic-api-wrong-context
									return;
								}
								throw error;
							}
							parsed.forEach((value, key) => {
								if (!key) return;
								try {
									cookieHelper.set(key, value.value, toCookieOptions(value));
								} catch {
									// this will fail if the cookie is being set on server component
								}
							});
							return;
						}
					}),
				},
			],
		},
	} satisfies BetterAuthPlugin;
};
