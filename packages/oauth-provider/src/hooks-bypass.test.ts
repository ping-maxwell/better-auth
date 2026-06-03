import { createAuthClient } from "better-auth/client";
import { genericOAuthClient } from "better-auth/client/plugins";
import { toNodeHandler } from "better-auth/node";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { jwt } from "better-auth/plugins/jwt";
import { getTestInstance } from "better-auth/test";
import { createAuthMiddleware } from "better-auth/api";
import type { Listener } from "listhen";
import { listen } from "listhen";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { oauthProviderClient } from "./client";
import { oauthProvider } from "./oauth";
import type { OAuthClient } from "./types/oauth";

/**
 * @see https://github.com/better-auth/better-auth/issues/9887
 *
 * These tests validate that configured `hooks.before` / `hooks.after` run consistently
 * for every request the auth instance processes - including when authorize resumes
 * after a fresh sign-in.
 */
describe("oauth-provider: hooks.before/after bypass issue", async () => {
	const port = 3003;
	const authServerBaseUrl = `http://localhost:${port}`;
	const rpBaseUrl = "http://localhost:5001";

	const hookCallPaths: string[] = [];

	const {
		auth: authorizationServer,
		signInWithTestUser,
		customFetchImpl,
		cookieSetter,
		testUser,
	} = await getTestInstance({
		baseURL: authServerBaseUrl,
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				hookCallPaths.push(ctx.path);
			}),
		},
		plugins: [
			jwt(),
			oauthProvider({
				loginPage: "/login",
				consentPage: "/consent",
				silenceWarnings: {
					oauthAuthServerConfig: true,
					openidConfig: true,
				},
			}),
		],
	});
	const authClient = createAuthClient({
		plugins: [oauthProviderClient()],
		baseURL: authServerBaseUrl,
		fetchOptions: {
			customFetchImpl,
		},
	});

	let server: Listener;
	let oauthClient: OAuthClient | null;

	const providerId = "test";
	const redirectUri = `${rpBaseUrl}/api/auth/oauth2/callback/${providerId}`;

	beforeAll(async () => {
		server = await listen(
			async (req, res) => {
				if (req.url === "/.well-known/openid-configuration") {
					const config = await authorizationServer.api.getOpenIdConfig();
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify(config));
				} else {
					await toNodeHandler(authorizationServer.handler)(req, res);
				}
			},
			{
				port,
			},
		);

		const { headers } = await signInWithTestUser();
		const response = await authorizationServer.api.adminCreateOAuthClient({
			headers,
			body: {
				redirect_uris: [redirectUri],
				skip_consent: true,
			},
		});
		expect(response?.client_id).toBeDefined();
		expect(response?.client_secret).toBeDefined();
		oauthClient = response;

		hookCallPaths.length = 0;
	});

	afterAll(async () => {
		await server.close();
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9887
	 *
	 * This test validates that hooks.before is NOT called when authorize resumes
	 * after a fresh sign-in. This is the bug - hooks.before SHOULD be called.
	 *
	 * The test is expected to FAIL once the fix is applied, at which point
	 * the assertion should be updated to expect hooks.before to be called.
	 */
	it("should call hooks.before when authorize resumes after fresh sign-in (currently FAILS)", async ({
		onTestFinished,
	}) => {
		if (!oauthClient?.client_id || !oauthClient?.client_secret) {
			throw Error("beforeAll not run properly");
		}

		hookCallPaths.length = 0;

		const { customFetchImpl: customFetchImplRP } = await getTestInstance(
			{
				account: {
					accountLinking: {
						trustedProviders: [providerId],
					},
				},
				plugins: [
					genericOAuth({
						config: [
							{
								scopes: ["openid", "profile", "email"],
								providerId,
								redirectURI: redirectUri,
								authorizationUrl: `${authServerBaseUrl}/api/auth/oauth2/authorize`,
								tokenUrl: `${authServerBaseUrl}/api/auth/oauth2/token`,
								userInfoUrl: `${authServerBaseUrl}/api/auth/oauth2/userinfo`,
								clientId: oauthClient.client_id,
								clientSecret: oauthClient.client_secret,
								pkce: true,
							},
						],
					}),
				],
			},
			{
				disableTestUser: true,
			},
		);

		const client = createAuthClient({
			plugins: [genericOAuthClient()],
			baseURL: rpBaseUrl,
			fetchOptions: {
				customFetchImpl: customFetchImplRP,
			},
		});
		const headers = new Headers();
		const data = await client.signIn.oauth2(
			{
				providerId,
				callbackURL: "/success",
			},
			{
				throw: true,
				onSuccess: cookieSetter(headers),
			},
		);
		expect(data.url).toContain(
			`${authServerBaseUrl}/api/auth/oauth2/authorize`,
		);

		hookCallPaths.length = 0;

		let loginRedirectUri = "";
		await authClient.$fetch(data.url, {
			method: "GET",
			onError(ctx) {
				loginRedirectUri = ctx.response.headers.get("Location") || "";
			},
		});
		expect(loginRedirectUri).toContain("/login");

		expect(hookCallPaths).toContain("/oauth2/authorize");
		const authorizeCallCountBeforeSignIn = hookCallPaths.filter(
			(p) => p === "/oauth2/authorize",
		).length;
		expect(authorizeCallCountBeforeSignIn).toBe(1);

		hookCallPaths.length = 0;

		vi.stubGlobal("window", {
			location: {
				search: new URL(loginRedirectUri, authServerBaseUrl).search,
			},
		});
		onTestFinished(() => {
			vi.unstubAllGlobals();
		});

		const signInResponse = await authClient.signIn.email(
			{
				email: testUser.email,
				password: testUser.password,
			},
			{
				throw: true,
			},
		);
		expect(signInResponse.redirect).toBe(true);
		expect(signInResponse.url).toContain(rpBaseUrl);

		const authorizeCallCountAfterSignIn = hookCallPaths.filter(
			(p) => p === "/oauth2/authorize",
		).length;

		expect(hookCallPaths).toContain("/sign-in/email");

		expect(authorizeCallCountAfterSignIn).toBe(1);
	});

	/**
	 * Additional test: Verify hooks.before IS called when already signed in
	 * (the working case - provided for comparison)
	 */
	it("hooks.before should be called when user is already signed in (working case)", async () => {
		if (!oauthClient?.client_id || !oauthClient?.client_secret) {
			throw Error("beforeAll not run properly");
		}

		hookCallPaths.length = 0;

		const { headers } = await signInWithTestUser();

		const { customFetchImpl: customFetchImplRP } = await getTestInstance(
			{
				account: {
					accountLinking: {
						trustedProviders: [providerId],
					},
				},
				plugins: [
					genericOAuth({
						config: [
							{
								scopes: ["openid", "profile", "email"],
								providerId,
								redirectURI: redirectUri,
								authorizationUrl: `${authServerBaseUrl}/api/auth/oauth2/authorize`,
								tokenUrl: `${authServerBaseUrl}/api/auth/oauth2/token`,
								userInfoUrl: `${authServerBaseUrl}/api/auth/oauth2/userinfo`,
								clientId: oauthClient.client_id,
								clientSecret: oauthClient.client_secret,
								pkce: true,
							},
						],
					}),
				],
			},
			{
				disableTestUser: true,
			},
		);

		const client = createAuthClient({
			plugins: [genericOAuthClient()],
			baseURL: rpBaseUrl,
			fetchOptions: {
				customFetchImpl: customFetchImplRP,
			},
		});
		const data = await client.signIn.oauth2(
			{
				providerId,
				callbackURL: "/success",
			},
			{
				throw: true,
				onSuccess: cookieSetter(headers),
			},
		);

		hookCallPaths.length = 0;

		let redirectUrl = "";
		await authClient.$fetch(data.url, {
			method: "GET",
			headers,
			onError(ctx) {
				redirectUrl = ctx.response.headers.get("Location") || "";
			},
		});

		expect(redirectUrl).toContain(rpBaseUrl);
		expect(redirectUrl).toContain("code=");

		expect(hookCallPaths).toContain("/oauth2/authorize");
		const authorizeCallCount = hookCallPaths.filter(
			(p) => p === "/oauth2/authorize",
		).length;
		expect(authorizeCallCount).toBe(1);
	});
});
