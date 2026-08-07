/**
 * @see https://github.com/better-auth/better-auth/issues/9433
 */
import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";

export const auth = betterAuth({
	plugins: [openAPI()],
});

export const authEmpty = betterAuth({
	plugins: [],
});

export const authNoPlugins = betterAuth({});

// auth.api must not be any
type Api = typeof auth.api;
type ApiEmpty = typeof authEmpty.api;
type ApiNoPlugins = typeof authNoPlugins.api;

// These should be callable (not any)
auth.api.getSession({ headers: new Headers() });
auth.api.generateOpenAPISchema();
authEmpty.api.getSession({ headers: new Headers() });
authNoPlugins.api.getSession({ headers: new Headers() });

// Validate that api is not `any` by checking that a non-existent property is an error
// (if api were `any`, accessing `.nonExistent` would not be an error)
// @ts-expect-error - nonExistent should not exist on api
auth.api.nonExistent;

// @ts-expect-error - nonExistent should not exist on api
authEmpty.api.nonExistent;

// @ts-expect-error - nonExistent should not exist on api
authNoPlugins.api.nonExistent;
