// cspell:ignore workerd
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withSpan } from "./pure.index";

type InstrumentationExport = Record<string, string | Record<string, string>>;

type CorePackageJSON = {
	exports: {
		"./instrumentation": InstrumentationExport;
	};
};

function readCorePackageJSON(): CorePackageJSON {
	return JSON.parse(
		readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
	) as CorePackageJSON;
}

/**
 * Simulates the Node.js / bundler export condition resolution algorithm.
 *
 * Iterates the export map keys in definition order. The first key that appears
 * in the given `conditions` set (or `"default"`) is selected. If the value is
 * a nested object, the algorithm recurses into it. Returns the resolved path
 * or `undefined` if nothing matched.
 */
function resolveExportConditions(
	exportMap: Record<string, string | Record<string, string>>,
	conditions: ReadonlySet<string>,
): string | undefined {
	for (const [key, value] of Object.entries(exportMap)) {
		if (key === "default" || conditions.has(key)) {
			if (typeof value === "string") return value;
			return resolveExportConditions(value, conditions);
		}
	}
	return undefined;
}

// @see https://github.com/better-auth/better-auth/issues/8765
describe("instrumentation (pure entry)", () => {
	it("returns the result of a sync fn", () => {
		expect(withSpan("test.sync", { k: 1 }, () => 42)).toBe(42);
	});

	it("returns the result of an async fn", async () => {
		await expect(
			withSpan("test.async", { k: 1 }, async () => {
				await Promise.resolve();
				return "ok";
			}),
		).resolves.toBe("ok");
	});

	it("propagates sync throws", () => {
		expect(() =>
			withSpan("test.sync.err", {}, () => {
				throw new Error("boom");
			}),
		).toThrow("boom");
	});

	it("propagates async rejections", async () => {
		await expect(
			withSpan("test.async.err", {}, async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
	});

	it("does not reference `@opentelemetry/api` at runtime", async () => {
		const mod = await import("./pure.index");
		expect(mod.withSpan.toString()).not.toContain("opentelemetry");
	});

	it("does not export symbols beyond the public surface of ./index", async () => {
		const pure = await import("./pure.index");
		const main = await import("./index");
		expect(Object.keys(pure).sort()).toEqual(Object.keys(main).sort());
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9365
	 */
	it("routes workerd package imports to the pure instrumentation entry", () => {
		const pkg = readCorePackageJSON();

		expect(pkg.exports["./instrumentation"].workerd).toBe(
			"./dist/instrumentation/pure.index.mjs",
		);
	});

	/**
	 * @see https://github.com/better-auth/better-auth/issues/9550
	 *
	 * Vite SSR automatically includes `"node"` in its condition set. Because
	 * `"node"` appears before `"workerd"` in the export map, the Node.js
	 * resolution algorithm (iterate keys in definition order, first match wins)
	 * selects the full OpenTelemetry entry even when `"workerd"` is also present.
	 *
	 * Additionally, the export map lacks an `"import"` condition. When a generic
	 * ESM bundler resolves with only `["import"]`, it falls through to
	 * `"default"` — again the full OpenTelemetry path.
	 */
	describe("export condition resolution for ESM bundlers", () => {
		const PURE_ENTRY = "./dist/instrumentation/pure.index.mjs";
		const FULL_ENTRY = "./dist/instrumentation/index.mjs";

		it("resolves to the full entry for node-only (conditions: node, import)", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const resolved = resolveExportConditions(
				exportMap,
				new Set(["node", "import"]),
			);
			expect(resolved).toBe(FULL_ENTRY);
		});

		it("resolves to the pure entry for Vite SSR targeting Cloudflare Workers (conditions: node, workerd, import)", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const resolved = resolveExportConditions(
				exportMap,
				new Set(["node", "workerd", "import"]),
			);
			expect(resolved).toBe(PURE_ENTRY);
		});

		it("resolves to the pure entry for workerd ESM (conditions: workerd, import)", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const resolved = resolveExportConditions(
				exportMap,
				new Set(["workerd", "import"]),
			);
			expect(resolved).toBe(PURE_ENTRY);
		});

		it("resolves to the pure entry for edge ESM (conditions: edge, import)", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const resolved = resolveExportConditions(
				exportMap,
				new Set(["edge", "import"]),
			);
			expect(resolved).toBe(PURE_ENTRY);
		});

		it("resolves to the pure entry for browser ESM (conditions: browser, import)", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const resolved = resolveExportConditions(
				exportMap,
				new Set(["browser", "import"]),
			);
			expect(resolved).toBe(PURE_ENTRY);
		});

		it("resolves to the full entry when only 'import' is in the condition set", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const resolved = resolveExportConditions(
				exportMap,
				new Set(["import"]),
			);
			expect(resolved).toBe(FULL_ENTRY);
		});

		it("has an 'import' condition so ESM bundlers do not fall through to 'default'", () => {
			const pkg = readCorePackageJSON();
			const exportMap = pkg.exports["./instrumentation"];
			const keys = Object.keys(exportMap);
			expect(keys).toContain("import");
		});
	});
});
