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

	async function getSessionWithExpiredCookieCache(nextHeaders: HeadersInit) {
		const cookieSetMock = vi.fn();
		const cookiesMock = vi.fn(async () => ({
			set: cookieSetMock,
			delete: vi.fn(),
			get: vi.fn(),
		}));
		const headersMock = vi.fn(async () => new Headers(nextHeaders));

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
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 300,
				},
				updateAge: 86400,
			},
		});

		const signInRes = await auth.api.signInEmail({
			body: {
				email: testUser.email,
				password: testUser.password,
			},
			returnHeaders: true,
		});

		const signInCookies = signInRes.headers
			.getSetCookie()
			.map((c) => c.split(";")[0]!)
			.join("; ");

		const firstGetReq = new Headers();
		firstGetReq.set("cookie", signInCookies);
		const firstRes = await auth.handler(
			new Request("http://localhost:3000/api/auth/get-session", {
				headers: firstGetReq,
			}),
		);
		expect(firstRes.status).toBe(200);

		const allCookies = [
			...signInRes.headers.getSetCookie(),
			...firstRes.headers.getSetCookie(),
		]
			.map((c) => c.split(";")[0]!)
			.join("; ");

		cookieSetMock.mockClear();
		cookiesMock.mockClear();
		headersMock.mockClear();

		vi.useFakeTimers();
		await vi.advanceTimersByTimeAsync(310_000);

		const secondGetReq = new Headers();
		secondGetReq.set("cookie", allCookies);
		const session = await auth.api.getSession({
			headers: secondGetReq,
		});

		return { session, cookieSetMock, cookiesMock, headersMock };
	}

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9360
	 *
	 * When cookie cache expires during initial SSR (no RSC: 1 header),
	 * the after hook must not call cookies().set(). In Next.js 16+,
	 * cookies().set() in a Server Component during streaming can stall
	 * the Suspense boundary, hanging the SSR stream indefinitely.
	 */
	it("should not call cookies().set() during initial SSR when cookie cache expires", async () => {
		const { session, cookieSetMock } = await getSessionWithExpiredCookieCache(
			{},
		);

		expect(session).not.toBeNull();
		expect(cookieSetMock).not.toHaveBeenCalled();
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9360
	 *
	 * RSC flight requests (RSC: 1 without next-action) should also
	 * never trigger cookies().set() when the cache is stale.
	 */
	it("should not call cookies().set() during RSC flight when cookie cache expires", async () => {
		const { session, cookieSetMock } = await getSessionWithExpiredCookieCache({
			RSC: "1",
		});

		expect(session).not.toBeNull();
		expect(cookieSetMock).not.toHaveBeenCalled();
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9360
	 *
	 * Server Actions (next-action header) CAN write cookies, so the
	 * after hook should forward them normally.
	 */
	it("should forward cookies via cookies().set() in server action context", async () => {
		const { session, cookieSetMock } = await getSessionWithExpiredCookieCache({
			"next-action": "abc123",
		});

		expect(session).not.toBeNull();
		expect(cookieSetMock).toHaveBeenCalled();
		const calls = cookieSetMock.mock.calls.map(
			(c: unknown[]) => c[0] as string,
		);
		expect(calls).toContain("better-auth.session_data");
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9360
	 *
	 * With a valid (non-expired) cookie cache, getSession returns from
	 * cache without writing any set-cookie headers, so the after hook
	 * is never triggered regardless of context.
	 */
	it("should not call cookies().set() when cookie cache is still valid", async () => {
		const cookieSetMock = vi.fn();
		const cookiesMock = vi.fn(async () => ({
			set: cookieSetMock,
			delete: vi.fn(),
			get: vi.fn(),
		}));
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
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 300,
				},
				updateAge: 86400,
			},
		});

		const signInRes = await auth.api.signInEmail({
			body: {
				email: testUser.email,
				password: testUser.password,
			},
			returnHeaders: true,
		});

		const signInCookies = signInRes.headers
			.getSetCookie()
			.map((c) => c.split(";")[0]!)
			.join("; ");

		const firstGetReq = new Headers();
		firstGetReq.set("cookie", signInCookies);
		const firstRes = await auth.handler(
			new Request("http://localhost:3000/api/auth/get-session", {
				headers: firstGetReq,
			}),
		);

		const allCookies = [
			...signInRes.headers.getSetCookie(),
			...firstRes.headers.getSetCookie(),
		]
			.map((c) => c.split(";")[0]!)
			.join("; ");

		cookieSetMock.mockClear();
		cookiesMock.mockClear();

		vi.useFakeTimers();
		await vi.advanceTimersByTimeAsync(60_000);

		const secondGetReq = new Headers();
		secondGetReq.set("cookie", allCookies);
		const session = await auth.api.getSession({
			headers: secondGetReq,
		});

		expect(session).not.toBeNull();
		expect(cookieSetMock).not.toHaveBeenCalled();
	});
});
