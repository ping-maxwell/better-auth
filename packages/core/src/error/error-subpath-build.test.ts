import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const distErrorIndex = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../dist/error/index.mjs",
);

/**
 * Bundlers (e.g. Nitro re-bundling SSR output with Rollup) resolve named imports
 * against the published `dist/error/index.mjs` file. The build must surface
 * `APIError` there, not only in TypeScript source.
 */
describe("@better-auth/core/error dist entry", () => {
	const distReady = existsSync(distErrorIndex);

	it.skipIf(!distReady)(
		"dist/error/index.mjs exposes APIError as a named export (Rollup static analysis)",
		async () => {
			const source = await readFile(distErrorIndex, "utf-8");
			expect(source).toMatch(
				/export\s*\{[^}]*\bAPIError\b[^}]*\}\s*;?/,
			);

			const mod = await import(pathToFileURL(distErrorIndex).href);
			expect(mod.APIError).toBeDefined();
			expect(typeof mod.APIError).toBe("function");
		},
	);
});
