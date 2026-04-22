import { describe, expect, it, vi } from "vitest";
import { drizzleAdapter } from "./drizzle-adapter";

describe("drizzle-adapter", () => {
	it("should create drizzle adapter", () => {
		const db = {
			_: {
				fullSchema: {},
			},
		} as any;
		const config = {
			provider: "sqlite" as const,
		};
		const adapter = drizzleAdapter(db, config);
		expect(adapter).toBeDefined();
	});

	describe("checkMissingFields", () => {
		function createMockDb(schema: Record<string, Record<string, any>>) {
			return {
				_: { fullSchema: schema },
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "1", name: "test" }]),
					}),
				}),
			} as any;
		}

		const defaultSecret = "test-secret-that-is-at-least-32-chars-long!!";

		it("should pass when drizzle schema has all required fields with default camelCase names", async () => {
			const userTable = {
				id: { name: "id" },
				name: { name: "name" },
				email: { name: "email" },
				emailVerified: { name: "emailVerified" },
				image: { name: "image" },
				createdAt: { name: "createdAt" },
				updatedAt: { name: "updatedAt" },
			};
			const db = createMockDb({ user: userTable });
			const factory = drizzleAdapter(db, { provider: "sqlite" });
			const adapter = factory({ secret: defaultSecret });

			await expect(
				adapter.create({
					model: "user",
					data: {
						name: "Test",
						email: "test@example.com",
					},
				}),
			).resolves.toBeDefined();
		});

		it("should pass when drizzle schema uses snake_case and fieldName is customized to match", async () => {
			const userTable = {
				id: { name: "id" },
				name: { name: "name" },
				email: { name: "email" },
				email_verified: { name: "email_verified" },
				image: { name: "image" },
				created_at: { name: "created_at" },
				updated_at: { name: "updated_at" },
			};
			const db = createMockDb({ user: userTable });
			const factory = drizzleAdapter(db, { provider: "sqlite" });
			const adapter = factory({
				secret: defaultSecret,
				user: {
					fields: {
						emailVerified: "email_verified",
						createdAt: "created_at",
						updatedAt: "updated_at",
					},
				},
			});

			await expect(
				adapter.create({
					model: "user",
					data: {
						name: "Test",
						email: "test@example.com",
					},
				}),
			).resolves.toBeDefined();
		});

		it("should throw a Drizzle-specific error when a field is missing from the drizzle schema", async () => {
			const userTable = {
				id: { name: "id" },
				name: { name: "name" },
				email: { name: "email" },
				// missing emailVerified, image, createdAt, updatedAt
			};
			const db = createMockDb({ user: userTable });
			const factory = drizzleAdapter(db, { provider: "sqlite" });
			const adapter = factory({ secret: defaultSecret });

			await expect(
				adapter.create({
					model: "user",
					data: {
						name: "Test",
						email: "test@example.com",
					},
				}),
			).rejects.toThrow(
				/does not exist in the "user" Drizzle schema.*update your drizzle schema/,
			);
		});

		it("should throw when schema is not provided", async () => {
			const db = {
				_: {},
				insert: vi.fn(),
			} as any;
			const factory = drizzleAdapter(db, {
				provider: "sqlite",
				schema: undefined,
			});
			const adapter = factory({ secret: defaultSecret });

			await expect(
				adapter.create({
					model: "user",
					data: { name: "Test", email: "test@example.com" },
				}),
			).rejects.toThrow(/Schema not found/);
		});
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9287
	 */
	describe("MySQL withReturning fallback returns wrong row when generateId is false", () => {
		const defaultSecret = "test-secret-that-is-at-least-32-chars-long!!";

		function createMysqlMockDb(
			schema: Record<string, Record<string, any>>,
			tableRows: Record<string, any[]>,
		) {
			const selectChain = (tableName: string) => {
				const chain: any = {};
				chain.from = vi.fn().mockImplementation((schemaModel: any) => {
					const modelName = Object.keys(schema).find(
						(k) => schema[k] === schemaModel,
					);
					chain._modelName = modelName;
					return chain;
				});
				chain.where = vi.fn().mockImplementation((..._args: any[]) => {
					return chain;
				});
				chain.orderBy = vi.fn().mockImplementation((..._args: any[]) => {
					chain._ordered = true;
					return chain;
				});
				chain.limit = vi.fn().mockImplementation((_n: number) => {
					return chain;
				});
				chain.execute = vi.fn().mockImplementation(() => {
					const modelName = chain._modelName;
					if (modelName && tableRows[modelName]) {
						const rows = [...tableRows[modelName]];
						if (chain._ordered) {
							rows.sort((a, b) => {
								if (a.id > b.id) return -1;
								if (a.id < b.id) return 1;
								return 0;
							});
						}
						return Promise.resolve([rows[0]]);
					}
					return Promise.resolve([]);
				});
				chain.then = (
					resolve: (v: any) => void,
					reject: (e: any) => void,
				) => {
					return chain.execute().then(resolve, reject);
				};
				return chain;
			};

			const insertChain: any = {};
			insertChain.values = vi.fn().mockImplementation((_values: any) => {
				insertChain.config = { values: [{}] };
				return insertChain;
			});
			insertChain.execute = vi.fn().mockResolvedValue(undefined);
			insertChain.returning = vi.fn();

			return {
				_: { fullSchema: schema },
				select: vi.fn().mockImplementation((...args: any[]) => {
					return selectChain(args[0]);
				}),
				insert: vi.fn().mockImplementation((_schemaModel: any) => {
					return insertChain;
				}),
			} as any;
		}

		it("should return the wrong session row due to ORDER BY id DESC fallback with non-monotonic IDs", async () => {
			const sessionTable = {
				id: { name: "id" },
				token: { name: "token" },
				userId: { name: "userId" },
				expiresAt: { name: "expiresAt" },
				ipAddress: { name: "ipAddress" },
				userAgent: { name: "userAgent" },
				createdAt: { name: "createdAt" },
				updatedAt: { name: "updatedAt" },
			};

			const existingRows = [
				{
					id: "zzzz-existing-session",
					token: "token-for-user-x",
					userId: "user-x",
					expiresAt: new Date(),
					ipAddress: null,
					userAgent: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "aaaa-new-session-for-user-a",
					token: "token-for-user-a",
					userId: "user-a",
					expiresAt: new Date(),
					ipAddress: null,
					userAgent: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			const db = createMysqlMockDb(
				{ session: sessionTable },
				{ session: existingRows },
			);

			const factory = drizzleAdapter(db, { provider: "mysql" });
			const adapter = factory({ secret: defaultSecret });

			const insertedSession = await adapter.create({
				model: "session",
				data: {
					token: "token-for-user-a",
					userId: "user-a",
					expiresAt: new Date(),
					ipAddress: null,
					userAgent: null,
				},
			});

			// BUG: The adapter falls through to `ORDER BY id DESC LIMIT 1`,
			// which returns "zzzz-existing-session" (User X's session)
			// instead of the newly inserted session for User A.
			// This is because the insert data has no `id` field
			// (generateId: false) and builder.config.values[0].id.value is
			// undefined, so the last else branch runs.
			expect(insertedSession.userId).toBe("user-x");
			expect(insertedSession.id).toBe("zzzz-existing-session");

			// What SHOULD happen: the adapter should return the row for user-a,
			// or throw an error instead of silently returning the wrong row.
			// Uncomment below to see the correct assertion that would pass after a fix:
			// expect(insertedSession.userId).toBe("user-a");
		});

		it("demonstrates the fallback path is reached when data has no id and builder values have no id", async () => {
			const sessionTable = {
				id: { name: "id" },
				token: { name: "token" },
				userId: { name: "userId" },
				expiresAt: { name: "expiresAt" },
				ipAddress: { name: "ipAddress" },
				userAgent: { name: "userAgent" },
				createdAt: { name: "createdAt" },
				updatedAt: { name: "updatedAt" },
			};

			const existingRows = [
				{
					id: "zzzz-old-session",
					token: "old-token",
					userId: "unrelated-user",
					expiresAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "abcd-userB-session",
					token: "userB-token",
					userId: "user-b",
					expiresAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			const db = createMysqlMockDb(
				{ session: sessionTable },
				{ session: existingRows },
			);

			const factory = drizzleAdapter(db, { provider: "mysql" });
			const adapter = factory({ secret: defaultSecret });

			const result = await adapter.create({
				model: "session",
				data: {
					token: "userB-token",
					userId: "user-b",
					expiresAt: new Date(),
				},
			});

			// Both User A and User B get the SAME session returned:
			// the one belonging to unrelated-user with the lexicographically
			// highest id ("zzzz-old-session").
			expect(result.userId).toBe("unrelated-user");
			expect(result.userId).not.toBe("user-b");
		});
	});
});
