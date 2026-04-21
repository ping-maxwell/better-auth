/**
 * @see https://github.com/better-auth/better-auth/issues/9212
 *
 * passkey plugin must be assignable to BetterAuthPlugin under
 * exactOptionalPropertyTypes: true.
 */
import { passkey } from "@better-auth/passkey";
import { passkeyClient } from "@better-auth/passkey/client";
import { betterAuth } from "better-auth";
import { createAuthClient } from "better-auth/client";

export const auth = betterAuth({
	plugins: [
		passkey({
			rpID: "localhost",
			rpName: "App",
			origin: "http://localhost:3000",
		}),
	],
});

export const authClient = createAuthClient({
	baseURL: "http://localhost:3000",
	plugins: [passkeyClient()],
});
