import { defineProject } from "vitest/config";

export default defineProject({
	resolve: {
		conditions: ["dev-source"],
	},
	test: {
		clearMocks: true,
		restoreMocks: true,
		environment: "happy-dom",
	},
});
