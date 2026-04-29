import { describe, expect, it, vi } from "vitest";
import { getTestInstance } from "../../test-utils/test-instance";

/**
 * Validation tests for PR #8877: sendOldEmailVerification option
 *
 * This feature allows users to skip the old email verification step
 * when changing their email by setting `sendOldEmailVerification: false`.
 * When disabled, the verification email is sent directly to the new email
 * address, but requires password or fresh session for security.
 */
describe("sendOldEmailVerification feature validation", () => {
	describe("when sendOldEmailVerification is false", () => {
		it("should skip old email and send verification directly to new email with correct password", async () => {
			const sendChangeEmail = vi.fn();
			let verificationToken = "";
			let verificationRecipient = "";

			const { client, testUser, db, signInWithTestUser } =
				await getTestInstance({
					emailVerification: {
						sendOldEmailVerification: false,
						async sendVerificationEmail({ user, token }) {
							verificationToken = token;
							verificationRecipient = user.email;
						},
					},
					user: {
						changeEmail: {
							enabled: true,
							sendChangeEmailConfirmation: async () => {
								sendChangeEmail();
							},
						},
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			const { runWithUser } = await signInWithTestUser();
			const newEmail = "new-direct-email@email.com";

			await runWithUser(async () => {
				const res = await client.changeEmail({
					newEmail,
					password: testUser.password,
				});
				expect(res.data?.status).toBe(true);

				// sendChangeEmailConfirmation should NOT be called (skipped)
				expect(sendChangeEmail).not.toHaveBeenCalled();

				// Verification should be sent directly to new email
				expect(verificationToken).toBeDefined();
				expect(verificationToken.length).toBeGreaterThan(0);
				expect(verificationRecipient).toBe(newEmail);

				// Verify the token works
				const verifyRes = await client.verifyEmail({
					query: { token: verificationToken },
				});
				expect(verifyRes.data?.status).toBe(true);

				// Email should now be updated
				const sessionRes = await client.getSession();
				expect(sessionRes.data?.user.email).toBe(newEmail);
			});
		});

		it("should reject with INVALID_PASSWORD when wrong password provided", async () => {
			const sendChangeEmail = vi.fn();
			const sendVerification = vi.fn();

			const { client, testUser, db, signInWithTestUser } =
				await getTestInstance({
					emailVerification: {
						sendOldEmailVerification: false,
						async sendVerificationEmail() {
							sendVerification();
						},
					},
					user: {
						changeEmail: {
							enabled: true,
							sendChangeEmailConfirmation: async () => {
								sendChangeEmail();
							},
						},
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			const { runWithUser } = await signInWithTestUser();

			await runWithUser(async () => {
				const res = await client.changeEmail({
					newEmail: "wrong-pass@email.com",
					password: "wrongpassword",
				});

				expect(res.error?.status).toBe(400);
				expect(res.error?.code).toBe("INVALID_PASSWORD");
				expect(sendChangeEmail).not.toHaveBeenCalled();
				expect(sendVerification).not.toHaveBeenCalled();
			});
		});

		it("should allow without password if session is fresh", async () => {
			let verificationToken = "";

			const { client, testUser, db, signInWithTestUser } =
				await getTestInstance({
					emailVerification: {
						sendOldEmailVerification: false,
						async sendVerificationEmail({ token }) {
							verificationToken = token;
						},
					},
					user: {
						changeEmail: {
							enabled: true,
						},
					},
					session: {
						freshAge: 60 * 60, // 1 hour - session will be fresh
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			const { runWithUser } = await signInWithTestUser();

			await runWithUser(async () => {
				const res = await client.changeEmail({
					newEmail: "fresh-session@email.com",
				});
				expect(res.data?.status).toBe(true);
				expect(verificationToken.length).toBeGreaterThan(0);
			});
		});

		it("should reject stale session without password with PASSWORD_OR_FRESH_SESSION_REQUIRED", async () => {
			const { client, testUser, db, signInWithTestUser } =
				await getTestInstance({
					emailVerification: {
						sendOldEmailVerification: false,
						async sendVerificationEmail() {},
					},
					user: {
						changeEmail: {
							enabled: true,
						},
					},
					session: {
						freshAge: 1, // 1 second - session will be stale quickly
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			const { headers } = await signInWithTestUser();

			// Get and make session stale
			const currentSession = await client.getSession({
				fetchOptions: { headers },
			});
			const sessionId = currentSession.data?.session.id;
			expect(sessionId).toBeDefined();

			await db.update({
				model: "session",
				update: {
					createdAt: new Date(Date.now() - 5_000).toISOString(),
				},
				where: [{ field: "id", value: sessionId! }],
			});

			const res = await client.changeEmail(
				{
					newEmail: "stale-session@email.com",
				},
				{
					headers,
				},
			);

			expect(res.error?.status).toBe(400);
			expect(res.error?.code).toBe("PASSWORD_OR_FRESH_SESSION_REQUIRED");
		});

		it("should not leak email existence (timing attack prevention)", async () => {
			const { client, signInWithUser } = await getTestInstance(
				{
					emailVerification: {
						sendOldEmailVerification: false,
						async sendVerificationEmail() {},
					},
					user: {
						changeEmail: {
							enabled: true,
						},
					},
				},
				{
					disableTestUser: true,
				},
			);

			const existingEmail = "existing-user@email.com";
			const nonExistingEmail = "non-existing@email.com";

			await client.signUp.email({
				email: existingEmail,
				password: "test123456",
				name: "Existing User",
			});

			await client.signUp.email({
				email: "changer@email.com",
				password: "test123456",
				name: "Changer",
			});

			const { headers } = await signInWithUser(
				"changer@email.com",
				"test123456",
			);

			// Both attempts should return the same status (no leak)
			const resExisting = await client.changeEmail(
				{ newEmail: existingEmail },
				{ headers },
			);
			const resNonExisting = await client.changeEmail(
				{ newEmail: nonExistingEmail },
				{ headers },
			);

			expect(resExisting.data?.status).toBe(true);
			expect(resNonExisting.data?.status).toBe(true);
		});
	});

	describe("when sendOldEmailVerification is true (default)", () => {
		it("should preserve default two-step flow", async () => {
			const sendChangeEmail = vi.fn();
			let newEmailVerificationToken = "";

			const { client, testUser, db, signInWithTestUser } =
				await getTestInstance({
					emailVerification: {
						async sendVerificationEmail({ token }) {
							newEmailVerificationToken = token;
						},
					},
					user: {
						changeEmail: {
							enabled: true,
							sendChangeEmailConfirmation: async ({
								user,
								newEmail,
								url,
								token,
							}) => {
								sendChangeEmail(user, newEmail, url, token);
							},
						},
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			const { runWithUser } = await signInWithTestUser();

			await runWithUser(async () => {
				const res = await client.changeEmail({
					newEmail: "two-step@email.com",
				});
				expect(res.data?.status).toBe(true);

				// Default flow: sendChangeEmailConfirmation SHOULD be called
				expect(sendChangeEmail).toHaveBeenCalled();

				// sendVerificationEmail should NOT be called yet
				expect(newEmailVerificationToken).toBe("");

				// Email should NOT be updated yet
				const sessionRes = await client.getSession();
				expect(sessionRes.data?.user.email).toBe(testUser.email);
			});
		});
	});

	describe("afterEmailChange hook", () => {
		it("should call afterEmailChange after email verification is complete", async () => {
			const afterEmailChange = vi.fn();
			let verificationToken = "";

			const { client, testUser, db, signInWithTestUser } =
				await getTestInstance({
					emailVerification: {
						sendOldEmailVerification: false,
						async sendVerificationEmail({ token }) {
							verificationToken = token;
						},
					},
					user: {
						changeEmail: {
							enabled: true,
							afterEmailChange: async (data) => {
								afterEmailChange(data);
							},
						},
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			const { runWithUser } = await signInWithTestUser();
			const newEmail = "hook-test@email.com";

			await runWithUser(async () => {
				await client.changeEmail({
					newEmail,
					password: testUser.password,
				});

				// afterEmailChange should NOT be called before verification
				expect(afterEmailChange).not.toHaveBeenCalled();

				await client.verifyEmail({
					query: { token: verificationToken },
				});

				// afterEmailChange SHOULD be called after verification
				expect(afterEmailChange).toHaveBeenCalledWith(
					expect.objectContaining({
						oldEmail: testUser.email,
						newEmail,
					}),
				);
			});
		});
	});

	describe("edge case: early config guard", () => {
		/**
		 * This tests the cubic-dev-ai review concern: "Early config guard doesn't
		 * account for sendOldEmailVerification=false, allowing email existence
		 * to be inferred when sendChangeEmailConfirmation is set but
		 * sendVerificationEmail is missing."
		 */
		it("should not allow email existence leak when sendOldEmailVerification=false but sendVerificationEmail missing", async () => {
			const sendChangeEmail = vi.fn();

			const { client, testUser, db, signInWithTestUser, sessionSetter } =
				await getTestInstance({
					emailVerification: {
						sendOldEmailVerification: false,
						// NOTE: sendVerificationEmail is NOT set
					},
					user: {
						changeEmail: {
							enabled: true,
							sendChangeEmailConfirmation: async () => {
								sendChangeEmail();
							},
						},
					},
				});

			await db.update({
				model: "user",
				update: { emailVerified: true },
				where: [{ field: "email", value: testUser.email }],
			});

			// Create another user with existing email
			const headers2 = new Headers();
			await client.signUp.email({
				name: "Other User",
				email: "existing-edge@test.com",
				password: "password123",
				fetchOptions: {
					onSuccess: sessionSetter(headers2),
				},
			});

			const { runWithUser } = await signInWithTestUser();

			await runWithUser(async () => {
				// Attempt to change to existing email
				const resExisting = await client.changeEmail({
					newEmail: "existing-edge@test.com",
					password: testUser.password,
				});

				// Attempt to change to non-existing email
				const resNonExisting = await client.changeEmail({
					newEmail: "non-existing-edge@test.com",
					password: testUser.password,
				});

				// Both should fail with the same error (no email leak)
				// If they differ, email existence can be inferred
				expect(resExisting.error?.status).toBe(resNonExisting.error?.status);
				expect(resExisting.error?.message).toBe(resNonExisting.error?.message);
			});
		});
	});
});
