import { defineConfig } from "tsdown";

export default defineConfig({
	dts: { build: true, incremental: true },
	format: ["esm"],
	entry: ["./src/index.ts"],
	treeshake: true,
	deps: {
		neverBundle: ["react", "react-dom", "better-auth", "@better-auth/react-ui"],
	},
});
