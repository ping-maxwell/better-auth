import { betterAuth } from "better-auth";
import { passkey } from "@better-auth/passkey";

export const auth = betterAuth({
	plugins: [
		passkey({
			rpID: "localhost",
			rpName: "App",
			origin: "http://localhost:3000",
		}),
	],
});
