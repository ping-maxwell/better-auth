import { safeJSONParse } from "@better-auth/core/utils/json";
import { beforeEach, describe, expect, it } from "vitest";
import { getTestInstance } from "../test-utils/test-instance";

/**
 * @see https://github.com/better-auth/better-auth/issues/9370
 */
describe("secondary storage - sessions only in secondary storage (storeSessionInDatabase unset)", () => {
	describe("without experimental.joins", async () => {
		const store = new Map<string, string>();

		const { client, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value, ttl) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			rateLimit: {
				enabled: false,
			},
			// storeSessionInDatabase is intentionally NOT set
		});

		beforeEach(() => {
			store.clear();
		});

		it("should allow sign-in and store session only in secondary storage", async () => {
			const { headers } = await signInWithTestUser();
			expect(store.size).toBe(2); // session token + active-sessions list

			const s1 = await client.getSession({
				fetchOptions: { headers },
			});
			expect(s1.data).not.toBeNull();
			expect(s1.data?.user.email).toBe("test@test.com");

			// Verify session is in secondary storage (check the store directly)
			const sessionToken = s1.data!.session.token;
			expect(store.has(sessionToken)).toBe(true);
		});
	});

	describe("with experimental.joins", async () => {
		const store = new Map<string, string>();

		const { client, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value, ttl) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			experimental: {
				joins: true,
			},
			rateLimit: {
				enabled: false,
			},
			// storeSessionInDatabase is intentionally NOT set
		});

		beforeEach(() => {
			store.clear();
		});

		it("should allow sign-in with experimental.joins enabled", async () => {
			// This test reproduces the issue in #9370
			// When secondaryStorage is configured without storeSessionInDatabase,
			// and experimental.joins is enabled, sign-in should still work
			const { headers } = await signInWithTestUser();
			expect(store.size).toBe(2); // session token + active-sessions list

			const s1 = await client.getSession({
				fetchOptions: { headers },
			});
			expect(s1.data).not.toBeNull();
			expect(s1.data?.user.email).toBe("test@test.com");
		});

		it("should allow get-session without errors", async () => {
			// First, get-session without any session should return null without errors
			const noSession = await client.getSession();
			expect(noSession.data).toBeNull();

			// Sign in and then get-session should work
			const { headers } = await signInWithTestUser();
			const session = await client.getSession({
				fetchOptions: { headers },
			});
			expect(session.data).not.toBeNull();
		});
	});

	describe("with cookieCache enabled", async () => {
		const store = new Map<string, string>();

		const { client, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value, ttl) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 60,
				},
				// storeSessionInDatabase is intentionally NOT set
			},
			experimental: {
				joins: true,
			},
			rateLimit: {
				enabled: false,
			},
		});

		beforeEach(() => {
			store.clear();
		});

		it("should allow sign-in with cookieCache enabled", async () => {
			// This test covers the exact scenario from #9370
			const { headers } = await signInWithTestUser();
			expect(store.size).toBe(2); // session token + active-sessions list

			const s1 = await client.getSession({
				fetchOptions: { headers },
			});
			expect(s1.data).not.toBeNull();
			expect(s1.data?.user.email).toBe("test@test.com");
		});
	});

	describe("with database hooks for sessions", async () => {
		const store = new Map<string, string>();
		let sessionCreateHookCalled = false;
		let sessionDeleteHookCalled = false;

		const { client, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value, ttl) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			experimental: {
				joins: true,
			},
			rateLimit: {
				enabled: false,
			},
			databaseHooks: {
				session: {
					create: {
						before: async (session) => {
							sessionCreateHookCalled = true;
						},
					},
					delete: {
						before: async (session) => {
							sessionDeleteHookCalled = true;
						},
					},
				},
			},
			// storeSessionInDatabase is intentionally NOT set
		});

		beforeEach(() => {
			store.clear();
			sessionCreateHookCalled = false;
			sessionDeleteHookCalled = false;
		});

		it("should allow sign-in even with session hooks registered", async () => {
			// This simulates plugins that register hooks for sessions
			const { headers } = await signInWithTestUser();
			expect(store.size).toBe(2);

			const s1 = await client.getSession({
				fetchOptions: { headers },
			});
			expect(s1.data).not.toBeNull();
			expect(s1.data?.user.email).toBe("test@test.com");

			// The hook should still be called even when session is in secondary storage only
			expect(sessionCreateHookCalled).toBe(true);
		});

		it("should allow session revoke with session hooks", async () => {
			const { headers } = await signInWithTestUser();
			const s1 = await client.getSession({
				fetchOptions: { headers },
			});

			const token = s1.data!.session.token;
			const revoke = await client.revokeSession({
				fetchOptions: { headers },
				token,
			});
			expect(revoke.data?.status).toBe(true);

			const after = await client.getSession({ fetchOptions: { headers } });
			expect(after.data).toBeNull();
		});
	});
});

describe("secondary storage - get returns JSON string", async () => {
	const store = new Map<string, string>();

	const { client, signInWithTestUser } = await getTestInstance({
		secondaryStorage: {
			set(key, value, ttl) {
				store.set(key, value);
			},
			get(key) {
				return store.get(key) || null;
			},
			delete(key) {
				store.delete(key);
			},
		},
		rateLimit: {
			enabled: false,
		},
	});

	beforeEach(() => {
		store.clear();
	});

	it("should work end-to-end with string return", async () => {
		expect(store.size).toBe(0);
		const { headers } = await signInWithTestUser();
		expect(store.size).toBe(2);

		const s1 = await client.getSession({
			fetchOptions: { headers },
		});
		expect(s1.data).toMatchObject({
			session: {
				userId: expect.any(String),
				token: expect.any(String),
				expiresAt: expect.any(Date),
				ipAddress: expect.any(String),
				userAgent: expect.any(String),
			},
			user: {
				id: expect.any(String),
				name: "test user",
				email: "test@test.com",
				emailVerified: false,
				image: null,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			},
		});

		const list = await client.listSessions({ fetchOptions: { headers } });
		expect(list.data?.length).toBe(1);

		const token = s1.data!.session.token;
		const revoke = await client.revokeSession({
			fetchOptions: { headers },
			token,
		});
		expect(revoke.data?.status).toBe(true);

		const after = await client.getSession({ fetchOptions: { headers } });
		expect(after.data).toBeNull();
		expect(store.size).toBe(0);
	});
});

describe("secondary storage - get returns already-parsed object", async () => {
	const store = new Map<string, any>();

	const { client, signInWithTestUser } = await getTestInstance({
		secondaryStorage: {
			set(key, value, ttl) {
				store.set(key, safeJSONParse(value));
			},
			get(key) {
				return store.get(key);
			},
			delete(key) {
				store.delete(key);
			},
		},
		rateLimit: {
			enabled: false,
		},
	});

	beforeEach(() => {
		store.clear();
	});

	it("should work end-to-end with object return", async () => {
		const { headers } = await signInWithTestUser();

		const s1 = await client.getSession({ fetchOptions: { headers } });
		expect(s1.data).not.toBeNull();

		const userId = s1.data!.session.userId;
		const activeList = store.get(`active-sessions-${userId}`);
		expect(Array.isArray(activeList)).toBe(true);
		expect(activeList.length).toBe(1);

		const list = await client.listSessions({ fetchOptions: { headers } });
		expect(list.data?.length).toBe(1);

		const token = s1.data!.session.token;
		const revoke = await client.revokeSession({
			fetchOptions: { headers },
			token,
		});
		expect(revoke.data?.status).toBe(true);

		const after = await client.getSession({ fetchOptions: { headers } });
		expect(after.data).toBeNull();
		const activeAfter = store.get(`active-sessions-${userId}`);
		expect(activeAfter ?? null).toBeNull();
	});
});

describe("secondary storage - storeSessionInDatabase", () => {
	describe("preserveSessionInDatabase: false", async () => {
		const store = new Map<string, string>();

		const { client, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value, ttl) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			session: {
				storeSessionInDatabase: true,
				preserveSessionInDatabase: false,
			},
			rateLimit: {
				enabled: false,
			},
		});

		beforeEach(() => {
			store.clear();
		});

		it("should not return a revoked session when it is deleted from both storages", async () => {
			const { headers } = await signInWithTestUser();

			const s1 = await client.getSession({ fetchOptions: { headers } });
			expect(s1.data).not.toBeNull();
			const token = s1.data!.session.token;

			expect(store.has(token)).toBe(true);

			const revoke = await client.revokeSession({
				fetchOptions: { headers },
				token,
			});
			expect(revoke.data?.status).toBe(true);

			expect(store.has(token)).toBe(false);

			// Revoke deletes from both secondary storage and database,
			// so the session should not be usable
			const after = await client.getSession({ fetchOptions: { headers } });
			expect(after.data).toBeNull();
		});
	});

	describe("preserveSessionInDatabase: true", async () => {
		const store = new Map<string, string>();

		const { client, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value, ttl) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			session: {
				storeSessionInDatabase: true,
				preserveSessionInDatabase: true,
			},
			rateLimit: {
				enabled: false,
			},
		});

		beforeEach(() => {
			store.clear();
		});

		it("should not return a revoked session even if it exists in database", async () => {
			const { headers } = await signInWithTestUser();

			const s1 = await client.getSession({ fetchOptions: { headers } });
			expect(s1.data).not.toBeNull();
			const token = s1.data!.session.token;

			// Session should exist in secondary storage
			expect(store.has(token)).toBe(true);

			// Revoke the session
			const revoke = await client.revokeSession({
				fetchOptions: { headers },
				token,
			});
			expect(revoke.data?.status).toBe(true);

			// Session should be removed from secondary storage
			expect(store.has(token)).toBe(false);

			// Session should NOT be usable anymore, even though it's preserved in database
			const after = await client.getSession({ fetchOptions: { headers } });
			expect(after.data).toBeNull();
		});
	});
});
