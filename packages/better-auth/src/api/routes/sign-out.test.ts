import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";

describe("sign-out", async () => {
	const afterSessionDeleted = vi.fn();
	const { signInWithTestUser, client, auth } = await getTestInstance({
		databaseHooks: {
			session: {
				delete: {
					after: afterSessionDeleted,
				},
			},
		},
	});

	it("should sign out", async () => {
		const { runWithUser } = await signInWithTestUser();
		await runWithUser(async () => {
			const res = await client.signOut();
			expect(res.data).toMatchObject({
				success: true,
			});

			expect(afterSessionDeleted).toHaveBeenCalled();
		});
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9295
	 */
	describe("should not return 500 for empty or malformed JSON body", () => {
		it("should handle empty string body with Content-Type: application/json", async () => {
			const res = await auth.handler(
				new Request("http://localhost:3000/api/auth/sign-out", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						origin: "http://localhost:3000",
					},
					body: "",
				}),
			);
			expect(res.status).not.toBe(500);
		});

		it("should handle malformed JSON body with Content-Type: application/json", async () => {
			const res = await auth.handler(
				new Request("http://localhost:3000/api/auth/sign-out", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						origin: "http://localhost:3000",
					},
					body: "not json",
				}),
			);
			expect(res.status).not.toBe(500);
		});

		it("should handle valid empty object body normally", async () => {
			const res = await auth.handler(
				new Request("http://localhost:3000/api/auth/sign-out", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						origin: "http://localhost:3000",
					},
					body: "{}",
				}),
			);
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toMatchObject({ success: true });
		});
	});
});
