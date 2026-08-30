import type { APIError } from "@better-auth/core/error";
import { getTestInstance } from "better-auth/test";
import { describe, expect, it } from "vitest";
import { apiKey } from ".";
import { apiKeyClient } from "./client";
import { isAPIError } from "./utils";

/**
 * @see https://github.com/better-auth/better-auth/issues/9504
 */
describe("api-key rate limit status code", async () => {
	const { auth, signInWithTestUser } = await getTestInstance(
		{
			plugins: [
				apiKey({
					enableSessionForAPIKeys: true,
					rateLimit: {
						enabled: true,
						maxRequests: 2,
						timeWindow: 60000,
					},
				}),
			],
		},
		{
			clientOptions: {
				plugins: [apiKeyClient()],
			},
		},
	);

	it("should return TOO_MANY_REQUESTS (429) when rate limited via middleware, not UNAUTHORIZED (401)", async () => {
		const { user } = await signInWithTestUser();

		const createdKey = await auth.api.createApiKey({
			body: {
				userId: user.id,
			},
		});

		for (let i = 0; i < 2; i++) {
			const session = await auth.api.getSession({
				headers: { "x-api-key": createdKey.key },
			});
			expect(session).not.toBeNull();
		}

		try {
			await auth.api.getSession({
				headers: { "x-api-key": createdKey.key },
			});
			expect.fail("Should have thrown a rate-limit error");
		} catch (error: unknown) {
			expect(isAPIError(error)).toBe(true);
			const apiError = error as APIError;
			expect(apiError.body?.code).toBe("RATE_LIMITED");
			expect(apiError.status).toBe("TOO_MANY_REQUESTS");
		}
	});

	it("should return RATE_LIMITED code with correct status via verifyApiKey endpoint", async () => {
		const { user } = await signInWithTestUser();

		const createdKey = await auth.api.createApiKey({
			body: {
				userId: user.id,
				rateLimitEnabled: true,
				rateLimitMax: 2,
				rateLimitTimeWindow: 60000,
			},
		});

		for (let i = 0; i < 2; i++) {
			const result = await auth.api.verifyApiKey({
				body: { key: createdKey.key },
			});
			expect(result.valid).toBe(true);
		}

		const result = await auth.api.verifyApiKey({
			body: { key: createdKey.key },
		});
		expect(result.valid).toBe(false);
		expect(result.error?.code).toBe("RATE_LIMITED");
	});
});
