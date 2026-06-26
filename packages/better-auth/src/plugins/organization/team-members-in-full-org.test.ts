import { describe, expect, it } from "vitest";
import { createAuthClient } from "../../client";
import { getTestInstance } from "../../test-utils/test-instance";
import { organizationClient } from "./client";
import { organization } from "./organization";

/**
 * @see https://github.com/better-auth/better-auth/issues/8307
 */
describe("getFullOrganization should include team members", async () => {
	const { auth, signInWithTestUser, cookieSetter } = await getTestInstance({
		user: {
			modelName: "users",
		},
		plugins: [
			organization({
				async sendInvitationEmail() {},
				teams: {
					enabled: true,
				},
			}),
		],
		logger: {
			level: "error",
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => ({
						data: { ...user, emailVerified: true },
					}),
				},
			},
		},
	});

	const { headers } = await signInWithTestUser();
	const client = createAuthClient({
		plugins: [
			organizationClient({
				teams: {
					enabled: true,
				},
			}),
		],
		baseURL: "http://localhost:3000/api/auth",
		fetchOptions: {
			customFetchImpl: async (url, init) => {
				return auth.handler(new Request(url, init));
			},
		},
	});

	const memberUser = {
		email: "member@test.com",
		password: "password",
		name: "Member User",
	};

	const memberHeaders = new Headers();
	const memberRes = await client.signUp.email(memberUser, {
		onSuccess: cookieSetter(memberHeaders),
	});
	const memberUserId = memberRes.data?.user.id as string;

	let organizationId: string;
	let teamId: string;

	it("setup: create org, team, and add member to team", async () => {
		const orgRes = await client.organization.create({
			name: "Full Org Test",
			slug: "full-org-test",
			fetchOptions: { headers },
		});
		organizationId = orgRes.data?.id as string;
		expect(organizationId).toBeDefined();

		const teamRes = await client.organization.createTeam(
			{
				name: "Engineering",
				organizationId,
			},
			{ headers },
		);
		teamId = teamRes.data?.id as string;
		expect(teamId).toBeDefined();

		const currentSession = await client.getSession({
			fetchOptions: { headers },
		});
		const currentUserId = currentSession.data?.user.id as string;

		await auth.api.addTeamMember({
			headers,
			body: {
				userId: currentUserId,
				teamId,
				organizationId,
			},
		});

		await auth.api.addMember({
			body: {
				organizationId,
				userId: memberUserId,
				role: "member",
			},
		});

		await auth.api.addTeamMember({
			headers,
			body: {
				userId: memberUserId,
				teamId,
				organizationId,
			},
		});

		const teamMembers = await auth.api.listTeamMembers({
			headers,
			query: { teamId },
		});
		expect(teamMembers.some((m) => m.userId === memberUserId)).toBe(true);
		expect(teamMembers.some((m) => m.userId === currentUserId)).toBe(true);
	});

	it("getFullOrganization should include team members for each team", async () => {
		const fullOrg = await auth.api.getFullOrganization({
			headers,
		});

		expect(fullOrg).not.toBeNull();
		expect(fullOrg?.teams).toBeDefined();
		expect(fullOrg?.teams?.length).toBeGreaterThan(0);

		const engineeringTeam = fullOrg?.teams?.find(
			(t) => t.name === "Engineering",
		);
		expect(engineeringTeam).toBeDefined();

		// This is the bug: teams returned by getFullOrganization do NOT include
		// their team members. There is no `members` property on the team objects,
		// so consumers cannot correlate which org members belong to which teams
		// without making additional API calls.
		const teamWithMembers = engineeringTeam as Record<string, unknown>;
		expect(
			teamWithMembers.members,
			"Expected team to have a 'members' array containing team member data, " +
				"but getFullOrganization does not populate team members.",
		).toBeDefined();
		expect(teamWithMembers.members).toBeInstanceOf(Array);
		expect(teamWithMembers.members).toHaveLength(2);
	});

	it("getFullOrganization teams should have relational data to connect members to teams", async () => {
		const fullOrg = await auth.api.getFullOrganization({
			headers,
		});

		expect(fullOrg).not.toBeNull();
		const teams = fullOrg?.teams;
		expect(teams).toBeDefined();

		// Validate that there is SOME mechanism to relate members to teams.
		// Currently, the response gives members[] and teams[] as completely
		// independent arrays with no relational data connecting them.
		const hasTeamMemberRelation = teams?.some((team) => {
			const t = team as Record<string, unknown>;
			return (
				Array.isArray(t.members) ||
				Array.isArray(t.teamMembers) ||
				t.memberIds !== undefined
			);
		});

		expect(
			hasTeamMemberRelation,
			"Expected teams in getFullOrganization to include some form of member " +
				"relationship data (members array, teamMembers array, or memberIds), " +
				"but no relational data is present.",
		).toBe(true);
	});
});
