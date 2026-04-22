import { afterEach, describe, expect, it, vi } from "vitest";

describe("next-js integration", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
		vi.resetModules();
		vi.doUnmock("next/headers.js");
	});

	async function getSessionWithNextHeaders(
		nextHeaders: HeadersInit | "unavailable",
	) {
		const cookiesMock = vi.fn(async () => ({
			set: vi.fn(),
			delete: vi.fn(),
			get: vi.fn(),
		}));
		const headersMock =
			nextHeaders === "unavailable"
				? vi.fn(async () => {
						throw new Error("`headers` was called outside a request scope.");
					})
				: vi.fn(async () => new Headers(nextHeaders));

		vi.doMock("next/headers.js", () => ({
			cookies:
				nextHeaders === "unavailable"
					? vi.fn(async () => {
							throw new Error("`cookies` was called outside a request scope.");
						})
					: cookiesMock,
			headers: headersMock,
		}));

		const [{ getTestInstance }, { nextCookies }] = await Promise.all([
			import("../test-utils/test-instance"),
			import("./next-js"),
		]);

		const { auth, testUser } = await getTestInstance({
			plugins: [nextCookies()],
			session: {
				deferSessionRefresh: true,
				updateAge: 0,
			},
		});

		const signInRes = await auth.api.signInEmail({
			body: {
				email: testUser.email,
				password: testUser.password,
			},
			returnHeaders: true,
		});
		const requestHeaders = new Headers();
		requestHeaders.set("cookie", signInRes.headers.getSetCookie()[0]!);

		cookiesMock.mockClear();
		headersMock.mockClear();

		vi.useFakeTimers();
		await vi.advanceTimersByTimeAsync(1000);

		const session = await auth.api.getSession({
			headers: requestHeaders,
		});

		return {
			cookiesMock,
			headersMock,
			session: session as { needsRefresh?: boolean } | null,
		};
	}

	/**
	 * @see https://github.com/better-auth/better-auth/issues/8464
	 */
	it("should not probe cookies in server action context", async () => {
		const { cookiesMock, headersMock, session } =
			await getSessionWithNextHeaders({
				RSC: "1",
				"next-action": "abc123",
			});

		expect(headersMock).toHaveBeenCalledTimes(1);
		expect(cookiesMock).not.toHaveBeenCalled();
		expect(session).not.toBeNull();
		expect(session?.needsRefresh).toBe(true);
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/8464
	 */
	it("should skip refresh in server component context", async () => {
		const { cookiesMock, headersMock, session } =
			await getSessionWithNextHeaders({ RSC: "1" });

		expect(headersMock).toHaveBeenCalledTimes(1);
		expect(cookiesMock).not.toHaveBeenCalled();
		expect(session).not.toBeNull();
		expect(session?.needsRefresh).toBe(false);
	});

	it("should allow refresh in route handler context", async () => {
		const { cookiesMock, session } = await getSessionWithNextHeaders({});

		expect(cookiesMock).not.toHaveBeenCalled();
		expect(session).not.toBeNull();
		expect(session?.needsRefresh).toBe(true);
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/8828
	 */
	it("should not leak __better-auth-cookie-store cookie", async () => {
		vi.doMock("next/headers.js", () => ({
			cookies: vi.fn(async () => ({
				set: vi.fn(),
				delete: vi.fn(),
				get: vi.fn(),
			})),
			headers: vi.fn(async () => new Headers({ RSC: "1" })),
		}));

		const [{ getTestInstance }, { nextCookies }] = await Promise.all([
			import("../test-utils/test-instance"),
			import("./next-js"),
		]);

		const { auth, testUser } = await getTestInstance({
			plugins: [nextCookies()],
		});

		const signInRes = await auth.api.signInEmail({
			body: {
				email: testUser.email,
				password: testUser.password,
			},
			returnHeaders: true,
		});
		const requestHeaders = new Headers();
		requestHeaders.set("cookie", signInRes.headers.getSetCookie()[0]!);

		const res = await auth.handler(
			new Request("http://localhost:3000/api/auth/get-session", {
				headers: requestHeaders,
			}),
		);

		const setCookies = res.headers.getSetCookie();
		const hasProbeCookie = setCookies.some((c) =>
			c.includes("__better-auth-cookie-store"),
		);
		expect(hasProbeCookie).toBe(false);
	});

	it("should handle unavailable headers gracefully", async () => {
		const { session } = await getSessionWithNextHeaders("unavailable");

		expect(session).not.toBeNull();
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/8784
	 *
	 * Validates that the old cookie-probe approach would have leaked
	 * `__better-auth-cookie-store` to clients. Next.js's `cookies().delete()`
	 * sets the value to empty + maxAge=0 but does NOT remove the key from the
	 * internal map, so the response still contains a Set-Cookie header for it.
	 */
	it("should not leak __better-auth-cookie-store via cookie probe (issue #8784)", async () => {
		const cookieMap = new Map<string, { value: string; options?: unknown }>();
		const cookieStoreMock = {
			set: vi.fn(
				(name: string, value: string, options?: Record<string, unknown>) => {
					cookieMap.set(name, { value, options });
				},
			),
			delete: vi.fn((name: string) => {
				cookieMap.set(name, {
					value: "",
					options: { maxAge: 0, expires: new Date(0) },
				});
			}),
			get: vi.fn(),
		};
		const cookiesMock = vi.fn(async () => cookieStoreMock);
		const headersMock = vi.fn(async () => new Headers({}));

		vi.doMock("next/headers.js", () => ({
			cookies: cookiesMock,
			headers: headersMock,
		}));

		const [{ getTestInstance }, { nextCookies }] = await Promise.all([
			import("../test-utils/test-instance"),
			import("./next-js"),
		]);

		const { auth, testUser } = await getTestInstance({
			plugins: [nextCookies()],
		});

		const signInRes = await auth.api.signInEmail({
			body: {
				email: testUser.email,
				password: testUser.password,
			},
			returnHeaders: true,
		});
		const requestHeaders = new Headers();
		requestHeaders.set("cookie", signInRes.headers.getSetCookie()[0]!);

		const res = await auth.handler(
			new Request("http://localhost:3000/api/auth/get-session", {
				headers: requestHeaders,
			}),
		);

		const setCookies = res.headers.getSetCookie();
		const hasProbeCookie = setCookies.some((c) =>
			c.includes("__better-auth-cookie-store"),
		);
		expect(hasProbeCookie).toBe(false);

		expect(cookieStoreMock.set).not.toHaveBeenCalledWith(
			"__better-auth-cookie-store",
			expect.anything(),
			expect.anything(),
		);
		expect(cookieStoreMock.delete).not.toHaveBeenCalledWith(
			"__better-auth-cookie-store",
		);

		expect(cookieMap.has("__better-auth-cookie-store")).toBe(false);
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/8784
	 *
	 * Demonstrates the root cause: Next.js cookies().delete() doesn't truly
	 * remove a cookie -- it just empties the value with maxAge=0. If the old
	 * probe code ran, the cookie would still leak.
	 */
	it("simulates the Next.js delete() behavior that caused the leak", () => {
		const cookieMap = new Map<string, { value: string; maxAge?: number }>();

		const nextCookieStore = {
			set(name: string, value: string, opts?: { maxAge?: number }) {
				cookieMap.set(name, { value, maxAge: opts?.maxAge });
			},
			delete(name: string) {
				cookieMap.set(name, { value: "", maxAge: 0 });
			},
		};

		nextCookieStore.set("__better-auth-cookie-store", "1", { maxAge: 0 });
		nextCookieStore.delete("__better-auth-cookie-store");

		expect(cookieMap.has("__better-auth-cookie-store")).toBe(true);
		const entry = cookieMap.get("__better-auth-cookie-store");
		expect(entry?.value).toBe("");
		expect(entry?.maxAge).toBe(0);
	});
});
