import { describe, expect, expectTypeOf, it } from "vitest";
import { createAuthClient } from "../../client";
import { createAuthClient as createReactAuthClient } from "../../client/react";
import { getTestInstance } from "../../test-utils/test-instance";
import type { Session } from "./../../types";
import { twoFactor, twoFactorClient } from "../two-factor";
import { inferAdditionalFields } from "./client";

describe("additionalFields", async () => {
	const { auth, signInWithTestUser, customFetchImpl, sessionSetter } =
		await getTestInstance({
			plugins: [twoFactor()],
			user: {
				additionalFields: {
					newField: {
						type: "string",
						defaultValue: "default-value",
					},
					nonRequiredFiled: {
						type: "string",
						required: false,
					},
				},
			},
		});

	it("should extends fields", async () => {
		const { headers } = await signInWithTestUser();
		const res = await auth.api.getSession({
			headers,
		});
		expect(res?.user.newField).toBeDefined();
		expect(res?.user.nonRequiredFiled).toBeNull();
	});

	it("should require additional fields on signUp", async () => {
		await auth.api
			.signUpEmail({
				body: {
					email: "test@test.com",
					name: "test",
					password: "test-password",
					newField: "new-field",
					nonRequiredFiled: "non-required-field",
				},
			})
			.catch(() => {});

		const client = createAuthClient({
			plugins: [
				inferAdditionalFields({
					user: {
						newField: {
							type: "string",
						},
						nonRequiredFiled: {
							type: "string",
							defaultValue: "test",
						},
					},
				}),
			],
			baseURL: "http://localhost:3000",
			fetchOptions: {
				customFetchImpl,
			},
		});
		const headers = new Headers();
		await client.signUp.email(
			{
				email: "test3@test.com",
				name: "test3",
				password: "test-password",
				newField: "new-field",
			},
			{
				onSuccess: sessionSetter(headers),
			},
		);
		const res = await client.getSession({
			fetchOptions: {
				headers,
			},
		});
		expect(res.data?.user.newField).toBe("new-field");
	});

	it("should infer additional fields on update", async () => {
		const client = createAuthClient({
			plugins: [
				inferAdditionalFields({
					user: {
						newField: {
							type: "string",
						},
					},
				}),
			],
			baseURL: "http://localhost:3000",
			fetchOptions: {
				customFetchImpl,
			},
		});
		const headers = new Headers();
		await client.signUp.email(
			{
				email: "test5@test.com",
				name: "test5",
				password: "test-password",
				newField: "new-field",
			},
			{
				onSuccess: sessionSetter(headers),
			},
		);
		await client.updateUser({
			name: "test",
			newField: "updated-field",
			fetchOptions: {
				headers,
			},
		});
		const session = await client.getSession({
			fetchOptions: {
				headers,
				throw: true,
			},
		});
		expect(session?.user.newField).toBe("updated-field");
	});

	it("should work with other plugins", async () => {
		const client = createAuthClient({
			plugins: [
				inferAdditionalFields({
					user: {
						newField: {
							type: "string",
							required: true,
						},
					},
				}),
				twoFactorClient(),
			],
			baseURL: "http://localhost:3000",
			fetchOptions: {
				customFetchImpl,
			},
		});
		expectTypeOf(client.twoFactor).toMatchTypeOf<{}>();

		const headers = new Headers();
		await client.signUp.email(
			{
				email: "test4@test.com",
				name: "test4",
				password: "test-password",
				newField: "new-field",
			},
			{
				onSuccess: sessionSetter(headers),
			},
		);
		await client.updateUser(
			{
				name: "test",
				newField: "updated-field",
			},
			{
				headers,
			},
		);
	});

	it("should infer it on the client", async () => {
		const client = createAuthClient({
			plugins: [inferAdditionalFields<typeof auth>()],
		});
		type t = Awaited<ReturnType<typeof client.getSession>>["data"];
		expectTypeOf<t>().toMatchTypeOf<{
			user: {
				id: string;
				email: string;
				emailVerified: boolean;
				name: string;
				createdAt: Date;
				updatedAt: Date;
				image?: string | undefined;
				newField: string;
				nonRequiredFiled?: string | undefined;
			};
			session: Session;
		} | null>;
	});

	it("should infer it on the client without direct import", async () => {
		const client = createAuthClient({
			plugins: [
				inferAdditionalFields({
					user: {
						newField: {
							type: "string",
						},
					},
				}),
			],
		});
		type t = Awaited<ReturnType<typeof client.getSession>>["data"];
		expectTypeOf<t>().toMatchTypeOf<{
			user: {
				id: string;
				email: string;
				emailVerified: boolean;
				name: string;
				createdAt: Date;
				updatedAt: Date;
				image?: string | undefined;
				newField: string;
			};
			session: Session;
		} | null>;
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/7982
	 */
	it("should infer additional fields on signIn response with manual schema", async () => {
		const client = createReactAuthClient({
			plugins: [
				inferAdditionalFields({
					user: {
						role: {
							type: "string",
						},
						phone: {
							type: "string",
							required: false,
						},
					},
				}),
			],
		});

		const signInEmail = () =>
			client.signIn.email({
				email: "test@example.com",
				password: "test-password",
			});
		type SignInData = Awaited<ReturnType<typeof signInEmail>>["data"];
		type SignInUser = NonNullable<SignInData>["user"];
		expectTypeOf<SignInUser["phone"]>().toEqualTypeOf<
			string | undefined | null
		>();
		expectTypeOf<SignInUser["role"]>().toEqualTypeOf<string>();
	});

	it("should apply default values", async () => {
		const { auth, signInWithTestUser } = await getTestInstance({
			databaseHooks: {
				session: {
					create: {
						before: async (session) => {
							return {
								data: {
									newField2: "new-field-2",
								},
							};
						},
					},
				},
			},
			session: {
				additionalFields: {
					newField: {
						type: "string",
						defaultValue: "default-value",
					},
					newField2: {
						type: "string",
					},
				},
			},
		});

		const { headers } = await signInWithTestUser();
		const res = await auth.api.getSession({
			headers,
		});
		expect(res?.session.newField).toBe("default-value");
	});
	it("should apply default values with secondary storage", async () => {
		const store = new Map<string, string>();
		const { auth, signInWithTestUser } = await getTestInstance({
			secondaryStorage: {
				set(key, value) {
					store.set(key, value);
				},
				get(key) {
					return store.get(key) || null;
				},
				delete(key) {
					store.delete(key);
				},
			},
			databaseHooks: {
				session: {
					create: {
						before: async (session) => {
							return {
								data: {
									newField2: "new-field-2",
								},
							};
						},
					},
				},
			},
			session: {
				additionalFields: {
					newField: {
						type: "string",
						defaultValue: "default-value",
					},
					newField2: {
						type: "string",
					},
				},
			},
		});

		const { headers } = await signInWithTestUser();
		const res = await auth.api.getSession({
			headers,
		});
		expect(res?.session.newField).toBe("default-value");
	});
});

/**
 * @see https://github.com/better-auth/better-auth/issues/9247
 */
describe("additionalFields with fieldName mapping", async () => {
	it("should return additionalFields with custom fieldName in getSession", async () => {
		const { auth, db } = await getTestInstance({
			user: {
				additionalFields: {
					githubLogin: {
						type: "string",
						fieldName: "github_login",
						required: false,
						returned: true,
						input: false,
					},
					githubId: {
						type: "number",
						fieldName: "github_id",
						required: false,
						returned: true,
						input: false,
					},
					installationId: {
						type: "string",
						fieldName: "installation_id",
						required: false,
						returned: true,
						input: false,
					},
					apiKey: {
						type: "string",
						fieldName: "api_key",
						input: false,
						required: false,
						returned: false,
					},
				},
			},
		});

		const res = await auth.api.signUpEmail({
			body: {
				email: "fieldname-test@test.com",
				name: "FieldName Test",
				password: "test-password",
			},
		});

		await db.update({
			model: "user",
			where: [{ field: "id", value: res.user.id }],
			update: {
				githubLogin: "testuser",
				githubId: 12345,
				installationId: "inst_123",
				apiKey: "secret-api-key",
			},
		});

		const session = await auth.api.getSession({
			headers: {
				Authorization: `Bearer ${res.token}`,
			},
		});

		expect(session).toBeTruthy();
		expect(session?.user.githubLogin).toBe("testuser");
		expect(session?.user.githubId).toBe(12345);
		expect(session?.user.installationId).toBe("inst_123");
		expect(session?.user).not.toHaveProperty("apiKey");
	});

	it("should return additionalFields with custom fieldName via cookie cache", async () => {
		const { auth, client, testUser, db, cookieSetter } =
			await getTestInstance({
				user: {
					additionalFields: {
						githubLogin: {
							type: "string",
							fieldName: "github_login",
							required: false,
							returned: true,
							input: false,
						},
						githubId: {
							type: "number",
							fieldName: "github_id",
							required: false,
							returned: true,
							input: false,
						},
						apiKey: {
							type: "string",
							fieldName: "api_key",
							input: false,
							required: false,
							returned: false,
						},
					},
				},
				session: {
					cookieCache: {
						enabled: true,
						maxAge: 60 * 5,
					},
				},
			});

		const headers = new Headers();
		await client.signIn.email(
			{
				email: testUser.email,
				password: testUser.password,
			},
			{
				onSuccess: cookieSetter(headers),
			},
		);

		await db.update({
			model: "user",
			where: [{ field: "email", value: testUser.email }],
			update: {
				githubLogin: "testuser",
				githubId: 99999,
				apiKey: "secret-key",
			},
		});

		const sessionFromDb = await auth.api.getSession({
			query: { disableCookieCache: true },
			headers,
		});

		expect(sessionFromDb?.user.githubLogin).toBe("testuser");
		expect(sessionFromDb?.user.githubId).toBe(99999);
		expect(sessionFromDb?.user).not.toHaveProperty("apiKey");

		const sessionFromCache = await client.getSession({
			fetchOptions: { headers },
		});

		expect(sessionFromCache.data?.user).not.toHaveProperty("apiKey");
	});

	it("should return additionalFields with returned: true and input: false on server API", async () => {
		const { auth } = await getTestInstance({
			user: {
				additionalFields: {
					role: {
						type: "string",
						fieldName: "user_role",
						required: false,
						returned: true,
						input: false,
						defaultValue: "member",
					},
					secretToken: {
						type: "string",
						fieldName: "secret_token",
						required: false,
						returned: false,
						input: false,
					},
				},
			},
		});

		const res = await auth.api.signUpEmail({
			body: {
				email: "role-test@test.com",
				name: "Role Test",
				password: "test-password",
			},
		});

		const session = await auth.api.getSession({
			headers: {
				Authorization: `Bearer ${res.token}`,
			},
		});

		expect(session).toBeTruthy();
		expect(session?.user.role).toBe("member");
		expect(session?.user).not.toHaveProperty("secretToken");
	});

	it("should return additionalFields updated after session creation (simulating OAuth callback hook)", async () => {
		const { auth, db, client, cookieSetter } = await getTestInstance({
			user: {
				additionalFields: {
					githubLogin: {
						type: "string",
						fieldName: "github_login",
						required: false,
						returned: true,
						input: false,
					},
					githubId: {
						type: "number",
						fieldName: "github_id",
						required: false,
						returned: true,
						input: false,
					},
					apiKey: {
						type: "string",
						fieldName: "api_key",
						input: false,
						required: false,
						returned: false,
					},
				},
			},
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 60 * 5,
				},
			},
		});

		const signupRes = await auth.api.signUpEmail({
			body: {
				email: "hook-test@test.com",
				name: "Hook Test",
				password: "test-password",
			},
		});

		await db.update({
			model: "user",
			where: [{ field: "id", value: signupRes.user.id }],
			update: {
				githubLogin: "hook-user",
				githubId: 54321,
				apiKey: "secret",
			},
		});

		const serverSession = await auth.api.getSession({
			headers: {
				Authorization: `Bearer ${signupRes.token}`,
			},
		});

		expect(serverSession).toBeTruthy();
		expect(serverSession?.user.githubLogin).toBe("hook-user");
		expect(serverSession?.user.githubId).toBe(54321);
		expect(serverSession?.user).not.toHaveProperty("apiKey");

		const headers = new Headers();
		await client.signIn.email(
			{
				email: "hook-test@test.com",
				password: "test-password",
			},
			{
				onSuccess: cookieSetter(headers),
			},
		);

		const clientSession = await client.getSession({
			fetchOptions: { headers },
		});

		expect(clientSession.data?.user).toBeTruthy();
		expect((clientSession.data?.user as any).githubLogin).toBe("hook-user");
		expect((clientSession.data?.user as any).githubId).toBe(54321);
		expect(clientSession.data?.user).not.toHaveProperty("apiKey");
	});

	it("should not include additionalFields in cookie cache if fields were updated after sign-in", async () => {
		const { auth, db, client, cookieSetter } = await getTestInstance({
			user: {
				additionalFields: {
					githubLogin: {
						type: "string",
						fieldName: "github_login",
						required: false,
						returned: true,
						input: false,
					},
				},
			},
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 60 * 5,
				},
			},
		});

		const signupRes = await auth.api.signUpEmail({
			body: {
				email: "cache-test@test.com",
				name: "Cache Test",
				password: "test-password",
			},
		});

		const headers = new Headers();
		await client.signIn.email(
			{
				email: "cache-test@test.com",
				password: "test-password",
			},
			{
				onSuccess: cookieSetter(headers),
			},
		);

		const sessionBeforeUpdate = await client.getSession({
			fetchOptions: { headers },
		});
		expect((sessionBeforeUpdate.data?.user as any).githubLogin).toBeNull();

		await db.update({
			model: "user",
			where: [{ field: "id", value: signupRes.user.id }],
			update: {
				githubLogin: "late-update",
			},
		});

		const sessionFromCache = await client.getSession({
			fetchOptions: { headers },
		});
		expect((sessionFromCache.data?.user as any).githubLogin).toBeNull();

		const sessionFromDb = await auth.api.getSession({
			query: { disableCookieCache: true },
			headers,
		});
		expect(sessionFromDb?.user.githubLogin).toBe("late-update");
	});
});

describe("runtime", async () => {
	it("should apply default value function on runtime", async () => {
		const { auth } = await getTestInstance({
			user: {
				additionalFields: {
					newField: {
						type: "string",
						defaultValue: () => "test",
						required: false,
					},
					dateField: {
						type: "date",
						defaultValue: () =>
							new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
						required: false,
					},
				},
			},
		});

		const res = await auth.api.signUpEmail({
			body: {
				email: "test2@test.com",
				name: "test",
				password: "test-password",
			},
		});
		const session = await auth.api.getSession({
			headers: {
				Authorization: `Bearer ${res.token}`,
			},
		});
		expect(session?.user.newField).toBe("test");
		expect(session?.user.dateField).toBeInstanceOf(Date);
		expect(session?.user.dateField?.getTime()).toBeGreaterThan(
			new Date(Date.now() + 1000 * 60 * 60 * 23).getTime(),
		);
	});
});
