import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type BetterAuthPackageManifest = {
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

/**
 * Documents the package manifest shape that causes npm to retain `vitest` under
 * `npm ci --omit=dev` when the root project also lists `vitest` as a devDependency:
 * the optional peer edge from `better-auth` is resolved separately from devDependency omission.
 *
 * @see https://github.com/better-auth/better-auth/issues/9083
 */
describe("better-auth package manifest — vitest peer", () => {
	it("declares vitest as an optional peer dependency", () => {
		const pkg = JSON.parse(
			readFileSync(new URL("../package.json", import.meta.url), "utf8"),
		) as BetterAuthPackageManifest;

		expect(pkg.peerDependencies?.vitest).toMatch(
			/\^2\.0\.0 \|\| \^3\.0\.0 \|\| \^4\.0\.0/,
		);
		expect(pkg.peerDependenciesMeta?.vitest?.optional).toBe(true);
	});
});
