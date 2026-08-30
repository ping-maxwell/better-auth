import { APIError as BaseAPIError } from "better-call";
import { describe, expect, it } from "vitest";
import { APIError } from "../error";
import { isAPIError } from "./is-api-error";

/**
 * @see https://github.com/better-auth/better-auth/issues/9012
 *
 * When two copies of `better-call` exist in a pnpm workspace (due to different
 * zod peer dependency resolutions), the `instanceof APIError` check fails
 * because the APIError class from one copy is a different class identity than
 * the one used elsewhere.
 *
 * This causes after-hooks to be silently skipped for redirect-based endpoints
 * (/magic-link/verify, /callback/{provider}, etc.) because the error is
 * re-thrown instead of being caught and processed.
 *
 * The fix is to use `isAPIError()` which performs a three-layer check:
 * 1. `error instanceof BaseAPIError` (from better-call)
 * 2. `error instanceof APIError` (from @better-auth/core/error)
 * 3. `(error as { name?: string })?.name === "APIError"` (fallback check by name)
 */
describe("isAPIError", () => {
	describe("handles known APIError instances", () => {
		it("should return true for BaseAPIError from better-call", () => {
			const error = new BaseAPIError("BAD_REQUEST", {
				message: "Test error",
			});
			expect(isAPIError(error)).toBe(true);
		});

		it("should return true for APIError from @better-auth/core", () => {
			const error = new APIError("UNAUTHORIZED", {
				message: "Test error",
			});
			expect(isAPIError(error)).toBe(true);
		});
	});

	/**
	 * This test validates the core fix for issue #9012:
	 * When two copies of better-call exist (due to pnpm peer dependency resolution),
	 * the instanceof check fails. The isAPIError() function uses a name-based
	 * fallback to handle this case.
	 */
	describe("handles cross-module APIError instances (issue #9012)", () => {
		it("should return true for error with name='APIError' even if not instanceof known classes", () => {
			// Simulate an APIError from a different module copy
			// This is what happens when better-call@1.1.8_zod@3.x throws an error
			// that is caught by code using better-call@1.1.8_zod@4.x
			const crossModuleError = {
				name: "APIError",
				message: "redirect",
				statusCode: 302,
				headers: { location: "/callback" },
			};

			// Raw instanceof would fail (this is what was broken before)
			expect(crossModuleError instanceof BaseAPIError).toBe(false);
			expect(crossModuleError instanceof APIError).toBe(false);

			// But isAPIError() should still identify it correctly via the name fallback
			expect(isAPIError(crossModuleError)).toBe(true);
		});

		it("should return true for Error subclass with name='APIError'", () => {
			// Simulate a more realistic cross-module APIError that is still an Error
			class ForeignAPIError extends Error {
				statusCode: number;
				headers?: Record<string, string>;

				constructor(message: string, statusCode: number) {
					super(message);
					this.name = "APIError";
					this.statusCode = statusCode;
				}
			}

			const foreignError = new ForeignAPIError("redirect", 302);
			foreignError.headers = { location: "/callback" };

			// Raw instanceof would fail
			expect(foreignError instanceof BaseAPIError).toBe(false);
			expect(foreignError instanceof APIError).toBe(false);

			// But isAPIError() should still identify it correctly
			expect(isAPIError(foreignError)).toBe(true);
		});
	});

	describe("rejects non-APIError values", () => {
		it("should return false for null", () => {
			expect(isAPIError(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isAPIError(undefined)).toBe(false);
		});

		it("should return false for regular Error", () => {
			const error = new Error("Test error");
			expect(isAPIError(error)).toBe(false);
		});

		it("should return false for TypeError", () => {
			const error = new TypeError("Test error");
			expect(isAPIError(error)).toBe(false);
		});

		it("should return false for plain object without name='APIError'", () => {
			const obj = {
				message: "Test error",
				statusCode: 400,
			};
			expect(isAPIError(obj)).toBe(false);
		});

		it("should return false for object with different error name", () => {
			const obj = {
				name: "ValidationError",
				message: "Test error",
			};
			expect(isAPIError(obj)).toBe(false);
		});

		it("should return false for primitives", () => {
			expect(isAPIError("error")).toBe(false);
			expect(isAPIError(42)).toBe(false);
			expect(isAPIError(true)).toBe(false);
		});
	});
});
