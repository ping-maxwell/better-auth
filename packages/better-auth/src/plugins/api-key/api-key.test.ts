import { describe, expect, it } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";
import { apiKey, ERROR_CODES } from ".";
import { apiKeyClient } from "./client";
import type { ApiKey } from "./types";

describe("api-key", async () => {
	const { client, auth, signInWithTestUser } = await getTestInstance(
		{
			plugins: [
				apiKey({
					// events({ event, success, user, apiKey, error_code, error_message }) {
					// 	console.log({
					// 		event,
					// 		success,
					// 		user,
					// 		apiKey,
					// 		error_code,
					// 		error_message,
					// 	});
					// },
					enableMetadata: true,
				}),
			],
		},
		{
			clientOptions: {
				plugins: [apiKeyClient()],
			},
		},
	);
	const { headers, user } = await signInWithTestUser();

	// =========================================================================
	// CREATE API KEY
	// =========================================================================

	it("should fail to create API keys from client without headers", async () => {
		const apiKeyFail = await client.apiKey.create();

		expect(apiKeyFail.data).toBeNull();
		expect(apiKeyFail.error).toBeDefined();
		expect(apiKeyFail.error?.status).toEqual(401);
		expect(apiKeyFail.error?.statusText).toEqual("UNAUTHORIZED");
		expect(apiKeyFail.error?.message).toEqual(ERROR_CODES.UNAUTHORIZED_SESSION);
	});

	let firstApiKey: ApiKey;

	it("should successfully create API keys from client with headers", async () => {
		const apiKey = await client.apiKey.create({}, { headers: headers });
		if (apiKey.data) {
			firstApiKey = apiKey.data;
		}

		expect(apiKey.data).not.toBeNull();
		expect(apiKey.data?.key).toBeDefined();
		expect(apiKey.data?.userId).toEqual(user.id);
		expect(apiKey.data?.name).toBeNull();
		expect(apiKey.data?.prefix).toBeNull();
		expect(apiKey.data?.refillInterval).toBeNull();
		expect(apiKey.data?.refillAmount).toBeNull();
		expect(apiKey.data?.lastRefillAt).toBeNull();
		expect(apiKey.data?.enabled).toEqual(true);
		expect(apiKey.data?.rateLimitTimeWindow).toEqual(86400000);
		expect(apiKey.data?.rateLimitMax).toEqual(10);
		expect(apiKey.data?.requestCount).toEqual(0);
		expect(apiKey.data?.remaining).toBeNull();
		expect(apiKey.data?.lastRequest).toBeNull();
		expect(apiKey.data?.expiresAt).toBeNull();
		expect(apiKey.data?.createdAt).toBeDefined();
		expect(apiKey.data?.updatedAt).toBeDefined();
		expect(apiKey.data?.metadata).toBeNull();
		expect(apiKey.error).toBeNull();
	});

	interface Err {
		body: {
			code: string | undefined;
			message: string | undefined;
		};
		status: string;
		statusCode: string;
	}

	it("should fail to create API Keys from server without headers", async () => {
		let res: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({ body: {} });
			res.data = apiKey;
		} catch (error: any) {
			res.error = error;
		}

		expect(res.data).toBeNull();
		expect(res.error).toBeDefined();
		expect(res.error?.statusCode).toEqual(401);
		expect(res.error?.status).toEqual("UNAUTHORIZED");
		expect(res.error?.body.message).toEqual(ERROR_CODES.UNAUTHORIZED_SESSION);
	});

	it("should successfully create API keys from server with headers", async () => {
		const apiKey = await auth.api.createApiKey({
			body: {},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.key).toBeDefined();
		expect(apiKey.userId).toEqual(user.id);
		expect(apiKey.name).toBeNull();
		expect(apiKey.prefix).toBeNull();
		expect(apiKey.refillInterval).toBeNull();
		expect(apiKey.refillAmount).toBeNull();
		expect(apiKey.lastRefillAt).toBeNull();
		expect(apiKey.enabled).toEqual(true);
		expect(apiKey.rateLimitTimeWindow).toEqual(86400000);
		expect(apiKey.rateLimitMax).toEqual(10);
		expect(apiKey.requestCount).toEqual(0);
		expect(apiKey.remaining).toBeNull();
		expect(apiKey.lastRequest).toBeNull();
	});

	it("should create the API key with the given name", async () => {
		const apiKey = await auth.api.createApiKey({
			body: {
				name: "test-api-key",
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.name).toEqual("test-api-key");
	});

	it("should create the API key with a name that's shorter than the allowed minimum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					name: "test-api-key-that-is-shorter-than-the-allowed-minimum",
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(ERROR_CODES.INVALID_NAME_LENGTH);
	});

	it("should create the API key with a name that's longer than the allowed maximum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					name: "test-api-key-that-is-longer-than-the-allowed-maximum",
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(ERROR_CODES.INVALID_NAME_LENGTH);
	});

	it("should create the API key with the given prefix", async () => {
		const prefix = "test-api-key_";
		const apiKey = await auth.api.createApiKey({
			body: {
				prefix: prefix,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.prefix).toEqual(prefix);
		expect(apiKey.key.startsWith(prefix)).toEqual(true);
	});

	it("should create the API key with a prefix that's shorter than the allowed minimum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					prefix: "test-api-key-that-is-shorter-than-the-allowed-minimum",
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(
			ERROR_CODES.INVALID_PREFIX_LENGTH,
		);
	});

	it("should create the API key with a prefix that's longer than the allowed maximum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					prefix: "test-api-key-that-is-longer-than-the-allowed-maximum",
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(
			ERROR_CODES.INVALID_PREFIX_LENGTH,
		);
	});

	it("should create an API key with a custom expiresIn", async () => {
		const expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days
		const expectedResult = new Date().getTime() + expiresIn;
		const apiKey = await auth.api.createApiKey({
			body: {
				expiresIn: expiresIn,
			},
			headers,
		});
		expect(apiKey).not.toBeNull();
		expect(apiKey.expiresAt).toBeDefined();
		expect(apiKey.expiresAt?.getTime()).toBeGreaterThanOrEqual(expectedResult);
	});

	it("should fail to create a key with a custom expiresIn value when customExpiresTime is disabled", async () => {
		const { client, auth, signInWithTestUser } = await getTestInstance(
			{
				plugins: [
					apiKey({
						enableMetadata: true,
						keyExpiration: {
							disableCustomExpiresTime: true
						}
					}),
				],
			},
			{
				clientOptions: {
					plugins: [apiKeyClient()],
				},
			},
		);

		const { headers, user } = await signInWithTestUser();
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey2 = await auth.api.createApiKey({
				body: {
					expiresIn: 10000,
				},
				headers,
			});
			result.data = apiKey2;
		} catch (error:any) {
			result.error = error;
		}

		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.body.message).toEqual(ERROR_CODES.KEY_DISABLED_EXPIRATION);
	});

	it("should create an API key with an expiresIn that's smaller than the allowed minimum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const expiresIn = 1000 * 60 * 60 * 24 * 0.5; // half a day
			const apiKey = await auth.api.createApiKey({
				body: {
					expiresIn: expiresIn,
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(
			ERROR_CODES.EXPIRES_IN_IS_TOO_SMALL,
		);
	});

	it("should fail to create an API key with an expiresIn that's larger than the allowed maximum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const expiresIn = 1000 * 60 * 60 * 24 * 365 * 10; // 10 year
			const apiKey = await auth.api.createApiKey({
				body: {
					expiresIn: expiresIn,
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(
			ERROR_CODES.EXPIRES_IN_IS_TOO_LARGE,
		);
	});

	it("should fail to create API key when refill interval is provided, but no refill amount", async () => {
		let res: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					refillInterval: 1000,
				},
				headers,
			});
			res.data = apiKey;
		} catch (error: any) {
			res.error = error;
		}

		expect(res.data).toBeNull();
		expect(res.error).toBeDefined();
		expect(res.error?.status).toEqual("BAD_REQUEST");
		expect(res.error?.body.message).toEqual(
			ERROR_CODES.REFILL_INTERVAL_AND_AMOUNT_REQUIRED,
		);
	});

	it("should fail to create API key when refill amount is provided, but no refill interval", async () => {
		let res: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					refillAmount: 10,
				},
				headers,
			});
			res.data = apiKey;
		} catch (error: any) {
			res.error = error;
		}

		expect(res.data).toBeNull();
		expect(res.error).toBeDefined();
		expect(res.error?.status).toEqual("BAD_REQUEST");
		expect(res.error?.body.message).toEqual(
			ERROR_CODES.REFILL_AMOUNT_AND_INTERVAL_REQUIRED,
		);
	});

	it("should create the API key with the given refill interval & refill amount", async () => {
		const refillInterval = 10000;
		const refillAmount = 10;
		const apiKey = await auth.api.createApiKey({
			body: {
				refillInterval: refillInterval,
				refillAmount: refillAmount,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.refillInterval).toEqual(refillInterval);
		expect(apiKey.refillAmount).toEqual(refillAmount);
	});

	it("should create API Key with custom remaining", async () => {
		const remaining = 10;
		const apiKey = await auth.api.createApiKey({
			body: {
				remaining: remaining,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.remaining).toEqual(remaining);
	});

	it("should create API Key with custom remaining that's smaller than allowed minimum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const remaining = 0;
			const apiKey = await auth.api.createApiKey({
				body: {
					remaining: remaining,
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(ERROR_CODES.INVALID_REMAINING);
	});

	it("should create API Key with custom remaining that's larger than allowed maximum", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const remaining = Number.MAX_SAFE_INTEGER;
			const apiKey = await auth.api.createApiKey({
				body: {
					remaining: remaining,
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(ERROR_CODES.INVALID_REMAINING);
	});

	it("should create API key with invalid metadata", async () => {
		let result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					metadata: "invalid",
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(
			ERROR_CODES.INVALID_METADATA_TYPE,
		);
	});

	it("should create API key with valid metadata", async () => {
		const metadata = {
			test: "test",
		};
		const apiKey = await auth.api.createApiKey({
			body: {
				metadata: metadata,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.metadata).toEqual(metadata);
	});

	it("create API key's returned metadata should be an object", async () => {
		const metadata = {
			test: "test-123",
		};
		const apiKey = await auth.api.createApiKey({
			body: {
				metadata: metadata,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.metadata.test).toBeDefined();
		expect(apiKey.metadata.test).toEqual(metadata.test);
	});

	it("create api key with with metadata when metadata is disabled (should fail)", async () => {
		const { client, auth, signInWithTestUser } = await getTestInstance(
			{
				plugins: [
					apiKey({
						enableMetadata: false,
					}),
				],
			},
			{
				clientOptions: {
					plugins: [apiKeyClient()],
				},
			},
		);
		const { headers } = await signInWithTestUser();

		const metadata = {
			test: "test-123",
		};
		const result: { data: ApiKey | null; error: Err | null } = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.createApiKey({
				body: {
					metadata: metadata,
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}

		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("BAD_REQUEST");
		expect(result.error?.body.message).toEqual(ERROR_CODES.METADATA_DISABLED);
	});

	// =========================================================================
	// VERIFY API KEY
	// =========================================================================

	it("verify api key without headers (should fail)", async () => {
		const result: {
			data: {
				valid: boolean;
				key: Partial<ApiKey>;
			} | null;
			error: Err | null;
		} = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.verifyApiKey({
				body: {
					key: firstApiKey.key,
				},
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}

		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("UNAUTHORIZED");
		expect(result.error?.body.message).toEqual(
			ERROR_CODES.UNAUTHORIZED_SESSION,
		);
	});

	it("verify api key with headers", async () => {
		const apiKey = await auth.api.verifyApiKey({
			body: {
				key: firstApiKey.key,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.valid).toEqual(true);
		expect(apiKey.key).toBeDefined();
		expect(apiKey.key.id).toEqual(firstApiKey.id);
	});

	it("verify api key with invalid key (should fail)", async () => {
		let result: {
			data: {
				valid: boolean;
				key: Partial<ApiKey>;
			} | null;
			error: Err | null;
		} = {
			data: null,
			error: null,
		};
		try {
			const apiKey = await auth.api.verifyApiKey({
				body: {
					key: "invalid",
				},
				headers,
			});
			result.data = apiKey;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
		expect(result.error?.status).toEqual("NOT_FOUND");
		expect(result.error?.body.message).toEqual(ERROR_CODES.KEY_NOT_FOUND);
	});

	let rateLimitedApiKey: ApiKey;

	const {
		client: rateLimitClient,
		auth: rateLimitAuth,
		signInWithTestUser: rateLimitTestUser,
	} = await getTestInstance(
		{
			plugins: [
				apiKey({
					rateLimit: {
						enabled: true,
						timeWindow: 1000,
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

	const { headers: rateLimitUserHeaders } = await rateLimitTestUser();
	it("should fail to verify api key 20 times in a row due to rate-limit", async () => {
		const { data: apiKey2 } = await rateLimitClient.apiKey.create(
			{},
			{ headers: rateLimitUserHeaders },
		);

		if (!apiKey2) return;
		rateLimitedApiKey = apiKey2;

		for (let i = 0; i < 20; i++) {
			let result: {
				data: { valid: boolean; key: Partial<ApiKey> } | null;
				error: Err | null;
			} = {
				data: null,
				error: null,
			};
			try {
				const response = await rateLimitAuth.api.verifyApiKey({
					body: {
						key: apiKey2.key,
					},
					headers: rateLimitUserHeaders,
				});
				result.data = response;
			} catch (error: any) {
				result.error = error;
			}
			// console.log(i, result);

			if (i >= 10) {
				expect(result.error?.status).toEqual("FORBIDDEN");
				expect(result.error?.body.message).toEqual(
					ERROR_CODES.RATE_LIMIT_EXCEEDED,
				);
			} else {
				expect(result.error).toBeNull();
			}
		}
	});

	it("should allow us to verify api key after rate-limit window has passed", async () => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		let result: {
			data: { valid: boolean; key: Partial<ApiKey> } | null;
			error: Err | null;
		} = {
			data: null,
			error: null,
		};
		try {
			const response = await rateLimitAuth.api.verifyApiKey({
				body: {
					key: rateLimitedApiKey.key,
				},
				headers: rateLimitUserHeaders,
			});
			result.data = response;
		} catch (error: any) {
			result.error = error;
		}
		// console.log(result);
		expect(result.error).toBeNull();
		expect(result.data?.valid).toBe(true);
	});

	it("should check if verifying an api key's remaining count does go down", async () => {
		const remaining = 10;
		const { data: apiKey } = await client.apiKey.create(
			{
				remaining: remaining,
			},
			{ headers: headers },
		);
		if (!apiKey) return;
		const afterVerificationOnce = await auth.api.verifyApiKey({
			body: {
				key: apiKey.key,
			},
			headers,
		});
		expect(afterVerificationOnce?.valid).toEqual(true);
		expect(afterVerificationOnce?.key.remaining).toEqual(remaining - 1);
		const afterVerificationTwice = await auth.api.verifyApiKey({
			body: {
				key: apiKey.key,
			},
			headers,
		});
		expect(afterVerificationTwice?.valid).toEqual(true);
		expect(afterVerificationTwice?.key.remaining).toEqual(remaining - 2);
	});

	it("should fail if the api key has no remaining", async () => {
		const { data: apiKey } = await client.apiKey.create(
			{
				remaining: 1,
			},
			{ headers: headers },
		);
		if (!apiKey) return;
		// run verify once to make the remaining count go down to 0
		await auth.api.verifyApiKey({
			body: {
				key: apiKey.key,
			},
			headers,
		});
		let result: {
			data: { valid: boolean; key: Partial<ApiKey> } | null;
			error: Err | null;
		} = {
			data: null,
			error: null,
		};
		try {
			const afterVerification = await auth.api.verifyApiKey({
				body: {
					key: apiKey.key,
				},
				headers,
			});
			result.data = afterVerification;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.error?.status).toEqual("FORBIDDEN");
		expect(result.error?.body.message).toEqual(ERROR_CODES.KEY_EXPIRED);
	});

	it("should fail if the api key is expired", async () => {
		const { client, auth, signInWithTestUser } = await getTestInstance(
			{
				plugins: [
					apiKey({
						keyExpiration: {
							minExpiresIn: 1,
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
		const { headers } = await signInWithTestUser();

		const { data: apiKey2 } = await client.apiKey.create(
			{
				expiresIn: 100,
			},
			{ headers: headers },
		);

		if (!apiKey2) return;

		await new Promise((resolve) => setTimeout(resolve, 1000));

		let result: {
			data: { valid: boolean; key: Partial<ApiKey> } | null;
			error: Err | null;
		} = {
			data: null,
			error: null,
		};
		try {
			const afterVerification = await auth.api.verifyApiKey({
				body: {
					key: apiKey2.key,
				},
				headers,
			});
			result.data = afterVerification;
		} catch (error: any) {
			result.error = error;
		}
		expect(result.error?.status).toEqual("FORBIDDEN");
		expect(result.error?.body.message).toEqual(ERROR_CODES.KEY_DISABLED);
	});

	// =========================================================================
	// UPDATE API KEY
	// =========================================================================

	it("should fail to update api key name without headers", async () => {
		let result: { err: Err | null; data: Partial<ApiKey> | null } = {
			data: null,
			err: null,
		};

		try {
			const apiKey = await auth.api.updateApiKey({
				body: {
					keyId: firstApiKey.id,
					name: "test-api-key-that-is-longer-than-the-allowed-maximum",
				},
			});
			result.data = apiKey;
		} catch (error: any) {
			result.err = error;
		}

		expect(result.err).toBeDefined();
		expect(result.err?.status).toEqual("UNAUTHORIZED");
		expect(result.err?.body.message).toEqual(ERROR_CODES.UNAUTHORIZED_SESSION);
	});

	it("should update api key name with headers", async () => {
		const newName = "Hello World";
		const apiKey = await auth.api.updateApiKey({
			body: {
				keyId: firstApiKey.id,
				name: newName,
			},
			headers,
		});


		expect(apiKey).toBeDefined();
		expect(apiKey.name).not.toEqual(firstApiKey.name);
		expect(apiKey.name).toEqual(newName);
	});

	// =========================================================================
	// DELETE API KEY
	// =========================================================================

	// =========================================================================
	// GET API KEY
	// =========================================================================

	it("should get an API key by its ID", async () => {
		const apiKey = await auth.api.getApiKey({
			body: {
				id: firstApiKey.id,
			},
			headers,
		});

		expect(apiKey).not.toBeNull();
		expect(apiKey.key).toBeUndefined();
		expect(apiKey.id).toEqual(firstApiKey.id);
		expect(apiKey.userId).toEqual(firstApiKey.userId);
	});

	// =========================================================================
	// LIST API KEY
	// =========================================================================
});
