import { describe, expect, expectTypeOf, it } from "vitest";
import { createAccessControl } from "../access";
import type { Statements } from "../access/types";
import { hasPermissionFn } from "./permission";

describe("organization permission model (per-resource instance roles)", () => {
	it("has no hook for a resource instance id: same org role yields the same verdict for checks on that resource", () => {
		const ac = createAccessControl({
			project: ["create", "delete"],
		} as const);
		const admin = ac.newRole({ project: ["create", "delete"] });
		const roles = { admin };

		const alice = hasPermissionFn(
			{
				role: "admin",
				options: {} as never,
				permissions: { project: ["delete"] },
			},
			roles,
		);
		const bob = hasPermissionFn(
			{
				role: "admin",
				options: {} as never,
				permissions: { project: ["delete"] },
			},
			roles,
		);

		expect(alice).toBe(true);
		expect(bob).toBe(true);
		// There is no additional dimension (e.g. projectId) in the input for
		// per-instance differentiation; both members with `admin` are equivalent.
	});

	it("does not authorize permissions keyed by resource instance id", () => {
		const ac = createAccessControl({
			project: ["create", "delete"],
		} as const);
		const projectAdmin = ac.newRole({
			project: ["create"],
			/** project admins cannot delete globally in this fixture */
		});

		const result = projectAdmin.authorize({
			// Simulates "can delete project A only" via a distinguished key —
			// the authorize API only compares against top-level statement keys.
			["project:id-a" as "project"]: ["delete"],
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain("project:id-a");
	});

	it("rejects nested access-control statements at the type level", () => {
		const unsupportedNestedShape = {
			project: {
				permissions: ["create", "delete"],
				resourceSpecificRoles: {
					admin: ["create", "delete"],
				},
			},
			otherResource: ["read"],
		} as const;

		type IsStatements<T> = T extends Statements ? true : false;
		expectTypeOf<IsStatements<typeof unsupportedNestedShape>>().toEqualTypeOf<
			false
		>();
	});
});
