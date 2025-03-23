import { describe, test, expect } from "vitest";
import { createAdapter } from "..";
import type { AdapterConfig, CreateCustomAdapter } from "../types";
import type { BetterAuthOptions } from "../../../types";
import { betterAuth } from "../../../auth";
import { generateId } from "../../../utils";

/*

Note that there are basically 2 types of tests here:

1. Making sure that the data within each adapter call is correct. (Transformed to suit the DB, accurate according to the schema, etc.)
2. Making sure the output of each adapter call is correct. (The data is transformed back to the correct format, etc.)

The rest are just edge cases.

*/

async function createTestAdapter(
	props: {
		config?: Partial<AdapterConfig>;
		options?: BetterAuthOptions;
		adapter?: (
			...args: Parameters<CreateCustomAdapter>
		) => Partial<ReturnType<CreateCustomAdapter>>;
	} = {
		config: {
			adapterId: "test-id",
			adapterName: "Test Adapter",
			usePlural: false,
			debugLogs: false,
			supportsJSON: true,
			supportsDates: true,
			supportsBooleans: true,
		},
		options: {},
		adapter: () => ({}),
	},
) {
	const {
		config = {
			adapterId: "test-id",
			adapterName: "Test Adapter",
			usePlural: false,
			debugLogs: false,
			supportsJSON: true,
			supportsDates: true,
			supportsBooleans: true,
		},
		options = {},
		adapter = () => ({}),
	} = props;
	const testAdapter = createAdapter({
		config: Object.assign(
			{
				adapterId: "test-id",
				adapterName: "Test Adapter",
				usePlural: false,
				debugLogs: false,
				supportsJSON: true,
				supportsDates: true,
				supportsBooleans: true,
			},
			config,
		),
		adapter: (...args) => {
			const x = adapter(...args) as Partial<ReturnType<CreateCustomAdapter>>;
			return {
				async create(data) {
					if (x.create) {
						return await x.create(data);
					}
					return data.data;
				},
				async update(data) {
					if (x.update) {
						return await x.update(data);
					}
					return data.update;
				},
				async updateMany(data) {
					if (x.updateMany) {
						return await x.updateMany(data);
					}
					return 0;
				},
				async count(data) {
					if (x.count) {
						return await x.count(data);
					}
					return 0;
				},
				async delete(data) {
					if (x.delete) {
						return await x.delete(data);
					}
					return;
				},
				async deleteMany(data) {
					if (x.deleteMany) {
						return await x.deleteMany(data);
					}
					return 0;
				},
				async findMany(data) {
					if (x.findMany) {
						return await x.findMany(data);
					}
					return [];
				},
				async findOne(data) {
					if (x.findOne) {
						return await x.findOne(data);
					}
					return null;
				},
				options: x.options ?? {},
			};
		},
	});
	const auth = betterAuth({
		...options,
		database: testAdapter,
	});

	return (await auth.$context).adapter;
}

describe("Create Adapter Helper", async () => {
	const adapterId = "test-adapter-id";
	const adapter = await createTestAdapter({
		config: {
			adapterId,
		},
	});

	describe("Edge cases", () => {
		test("Should have the correct adapter id", () => {
			expect(adapter.id).toBe(adapterId);
		});
		test("Should use the id generator if passed into the betterAuth config", async () => {
			const adapter = await createTestAdapter({
				config: {
					debugLogs: {},
				},
				options: {
					advanced: {
						generateId(options) {
							return "HARD-CODED-ID";
						},
					},
				},
			});
			const res = await adapter.create({
				model: "user",
				data: { name: "test-name" },
			});
			expect(res).toHaveProperty("id");
			//@ts-ignore
			expect(res.id).toBe("HARD-CODED-ID");
		});
	});

	describe("Checking for the results of an adapter call, as well as the parameters passed into the adapter call", () => {
		describe("create", () => {
			test("Should fill in the missing fields in the result", async () => {
				const res = await adapter.create({
					model: "user",
					data: { name: "test-name" },
				});
				expect(res).toHaveProperty("id");
				expect(res).toHaveProperty("name");
				expect(res).toHaveProperty("email");
				expect(res).toHaveProperty("emailVerified");
				expect(res).toHaveProperty("image");
				expect(res).toHaveProperty("createdAt");
				expect(res).toHaveProperty("updatedAt");
				//@ts-ignore
				expect(res?.emailVerified).toEqual(false);
				//@ts-ignore
				expect(res?.name).toEqual("test-name");
				//@ts-ignore
				expect(res?.email).toEqual(undefined);
				//@ts-ignore
				expect(res?.image).toEqual(undefined);
				//@ts-ignore
				expect(res?.createdAt).toBeInstanceOf(Date);
				//@ts-ignore
				expect(res?.updatedAt).toBeInstanceOf(Date);
			});

			test('Should include an "id" in the result in all cases, unless "select" is used to exclude it', async () => {
				const res = await adapter.create({
					model: "user",
					data: { name: "test-name" },
				});
				expect(res).toHaveProperty("id");
				//@ts-ignore
				expect(typeof res?.id).toEqual("string");

				const adapterWithoutIdGeneration = await createTestAdapter({
					config: {
						disableIdGeneration: true,
						debugLogs: {},
					},
				});
				const res2 = await adapterWithoutIdGeneration.create({
					model: "user",
					data: { name: "test-name" },
				});
				// Id will still be present, due to the transformOutput function. However it will be undefined, vvvvv
				expect(res2).toHaveProperty("id");
				//@ts-expect-error - Given that this adapter has set disableIdGeneration to true, the id should be undefined
				expect(typeof res2?.id).toEqual("undefined");
				// In a real case, the `id` should always be present

				const res3 = await adapter.create({
					model: "user",
					data: { name: "test-name" },
					select: ["name"],
				});
				expect(res3).toHaveProperty("name");
				expect(res3).not.toHaveProperty("id");
			});

			test('Should recieve a generated id during the call, unless "disableIdGeneration" is set to true', async () => {
				const createWithId: { id: unknown } = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						adapter(args_0) {
							return {
								async create({ data, model, select }) {
									r(data as any);
									return data;
								},
							};
						},
					});
					adapter.create({
						model: "user",
						data: { name: "test-name" },
					});
				});

				expect(createWithId).toBeDefined();
				expect(createWithId.id).toBeDefined();
				expect(typeof createWithId.id).toBe("string");

				const createWithoutId: { id: unknown } = await new Promise(
					async (r) => {
						const adapter = await createTestAdapter({
							config: {
								disableIdGeneration: true,
								debugLogs: {},
							},
							adapter(args_0) {
								return {
									async create({ data, model, select }) {
										r(data as any);
										return data;
									},
								};
							},
						});
						adapter.create({
							model: "user",
							data: { name: "test-name" },
						});
					},
				);

				expect(createWithoutId).toBeDefined();
				expect(createWithoutId.id).toBeUndefined();
			});

			test("Should modify boolean type to 1 or 0 if the DB doesn't support it. And expect the result to be transformed back to boolean", async () => {
				// Testing true
				const createTRUEParameters: { data: { emailVerified: number } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsBooleans: false,
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { emailVerified: true },
						});
						expect(res).toHaveProperty("emailVerified");
						//@ts-ignore
						expect(res.emailVerified).toBe(true);
					});
				expect(createTRUEParameters.data).toHaveProperty("emailVerified");
				//@ts-ignore
				expect(createTRUEParameters.data.emailVerified).toBe(1);

				// Testing false
				const createFALSEParameters: { data: { emailVerified: number } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsBooleans: false,
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { emailVerified: false },
						});
						expect(res).toHaveProperty("emailVerified");
						//@ts-ignore
						expect(res.emailVerified).toBe(false);
					});
				expect(createFALSEParameters.data).toHaveProperty("emailVerified");
				//@ts-ignore
				expect(createFALSEParameters.data.emailVerified).toBe(0);
			});

			test("Should modify JSON type to TEXT if the DB doesn't support it. And expect the result to be transformed back to JSON", async () => {
				const createJSONParameters: { data: { preferences: string } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsJSON: false,
							},
							options: {
								user: {
									additionalFields: {
										preferences: {
											//@ts-expect-error - Not *technically* implemented yet, however the `createAdapter` helper already supports it.
											type: "json",
										},
									},
								},
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const obj = { preferences: { color: "blue", size: "large" } };
						const res = await adapter.create({
							model: "user",
							data: obj,
						});
						expect(res).toHaveProperty("preferences");
						expect(res.preferences).toEqual(obj.preferences);
					});
				expect(createJSONParameters.data).toHaveProperty("preferences");
				expect(createJSONParameters.data.preferences).toEqual(
					'{"color":"blue","size":"large"}',
				);
			});

			test("Should modify date type to TEXT if the DB doesn't support it. And expect the result to be transformed back to date", async () => {
				const testDate = new Date();
				const createDateParameters: { data: { createdAt: string } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsDates: false,
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { createdAt: testDate },
						});
						expect(res).toHaveProperty("createdAt");
						expect(res.createdAt).toBeInstanceOf(Date);
					});
				expect(createDateParameters.data).toHaveProperty("createdAt");
				expect(createDateParameters.data.createdAt).toEqual(
					testDate.toISOString(),
				);
			});

			test("Should allow custom transform input", async () => {
				const createCustomTransformInputParameters: { data: { name: string } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								debugLogs: {},
								customTransformInput({ field, data }) {
									if (field === "name") {
										return data.toUpperCase();
									}
									return data;
								},
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { name: "test-name" },
						});
						expect(res).toHaveProperty("name");
						expect(res.name).toEqual("TEST-NAME");
					});
				expect(createCustomTransformInputParameters.data).toHaveProperty(
					"name",
				);
				expect(createCustomTransformInputParameters.data.name).toEqual(
					"TEST-NAME",
				);
			});

			test("Should allow custom transform output", async () => {
				const createCustomTransformOutputParameters: {
					data: { name: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							customTransformOutput({ field, data }) {
								if (field === "name") {
									return data.toLowerCase();
								}
								return data;
							},
						},
						adapter(args_0) {
							return {
								async create(data) {
									r(data as any);
									return data.data;
								},
							};
						},
					});
					const res = await adapter.create({
						model: "user",
						data: { name: "TEST-NAME" },
					});
					expect(res).toHaveProperty("name");
					expect(res.name).toEqual("test-name");
				});
				expect(createCustomTransformOutputParameters.data).toHaveProperty(
					"name",
				);
				expect(createCustomTransformOutputParameters.data.name).toEqual(
					"TEST-NAME", // Remains the same as the input because we're only transforming the output
				);
			});

			test("Should allow custom transform input and output", async () => {
				const createCustomTransformInputAndOutputParameters: {
					data: { name: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							customTransformInput({ field, data }) {
								if (field === "name") {
									return data.toUpperCase();
								}
								return data;
							},
							customTransformOutput({ field, data }) {
								if (field === "name") {
									return data.toLowerCase();
								}
								return data;
							},
						},
						adapter(args_0) {
							return {
								async create(data) {
									r(data as any);
									return data.data;
								},
							};
						},
					});
					const res = await adapter.create({
						model: "user",
						data: { name: "TEST-NAME" },
					});
					expect(res).toHaveProperty("name");
					expect(res.name).toEqual("test-name");
				});
				expect(
					createCustomTransformInputAndOutputParameters.data,
				).toHaveProperty("name");
				expect(createCustomTransformInputAndOutputParameters.data.name).toEqual(
					"TEST-NAME",
				);
			});

			test("Should allow custom map input key transformation", async () => {
				const parameters: {
					data: { email_address: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							mapKeysTransformInput() {
								return {
									email: "email_address",
								};
							},
						},
						adapter(args_0) {
							return {
								async create(data) {
									r(data as any);
									return data.data;
								},
							};
						},
					});
					const res = (await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					})) as { email: string };

					expect(res).toHaveProperty("email");
					expect(res).not.toHaveProperty("email_address");
					expect(res.email).toEqual(undefined); // The reason it's undefined is because we did transform `email` to `email_address`, however we never transformed `email_address` back to `email`.
				});
				expect(parameters.data).toHaveProperty("email_address");
				expect(parameters.data.email_address).toEqual("test@test.com");
			});

			test("Should allow custom map output key transformation", async () => {
				const parameters: {
					data: { email: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							mapKeysTransformOutput() {
								return {
									wrong_email_key: "email",
								};
							},
						},

						adapter(args_0) {
							return {
								async create(data) {
									r(data as any);
									const new_data = { ...data.data };
									//@ts-ignore
									new_data["wrong_email_key"] = new_data["email"];
									// biome-ignore lint/performance/noDelete: <explanation>
									delete new_data["email"];
									return new_data;
								},
							};
						},
					});
					const res = (await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					})) as { email: string };
					// Even though we're using the output key transformation, we still don't actually get the key transformation we want.
					// This is because the output is also parsed against the schema, and the `wrong_email_key` key is not in the schema.
					expect(res).toHaveProperty("email");
					expect(res).not.toHaveProperty("wrong_email_key");
					expect(res.email).toEqual("test@test.com");
				});

				expect(parameters.data).toHaveProperty("email");
				expect(parameters.data.email).toEqual("test@test.com");
			});

			test("Should allow custom map input and output key transformation", async () => {
				const parameters: {
					data: { email_address: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							mapKeysTransformInput() {
								return {
									email: "email_address",
								};
							},
							mapKeysTransformOutput() {
								return {
									email_address: "email",
								};
							},
						},
						adapter(args_0) {
							return {
								async create(data) {
									r(data as any);
									return data.data;
								},
							};
						},
					});
					const res = await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					});
					expect(res).toHaveProperty("email");
					expect(res).not.toHaveProperty("email_address");
					expect(res.email).toEqual("test@test.com");
				});
				expect(parameters.data).toHaveProperty("email_address");
				expect(parameters.data).not.toHaveProperty("email");
				expect(parameters.data.email_address).toEqual("test@test.com");
			});

			test("Should expect the fields to be transformed into the correct field names if customized", async () => {
				const parameters: { data: any; select?: string[]; model: string } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								debugLogs: {},
							},
							options: {
								user: {
									fields: {
										email: "email_address",
									},
								},
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { email: "test@test.com" },
						});
						expect(res).toHaveProperty("email");
						expect(res).not.toHaveProperty("email_address");
						expect(res.email).toEqual("test@test.com");
					});
				expect(parameters).toHaveProperty("data");
				expect(parameters.data).toHaveProperty("email_address");
				expect(parameters.data).not.toHaveProperty("email");
				expect(parameters.data.email_address).toEqual("test@test.com");
			});

			test("Should expect the model to be transformed into the correct model name if customized", async () => {
				const parameters: { data: any; select?: string[]; model: string } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								debugLogs: {},
							},
							options: {
								user: {
									modelName: "user_table",
								},
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { email: "test@test.com" },
						});
						expect(res).toHaveProperty("id");
						expect(res).toHaveProperty("email");
					});
				expect(parameters).toHaveProperty("model");
				expect(parameters.model).toEqual("user_table");
			});

			test("Should expect the result to follow the schema", async () => {
				const parameters: { data: any; select?: string[]; model: string } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								debugLogs: {},
							},
							options: {
								user: {
									fields: {
										email: "email_address",
									},
								},
							},
							adapter(args_0) {
								return {
									async create(data) {
										r(data as any);
										return data.data;
									},
								};
							},
						});
						const res = await adapter.create({
							model: "user",
							data: { email: "test@test.com" },
						});
						expect(res).toHaveProperty("email");
						expect(res).toHaveProperty("id");
						expect(res).toHaveProperty("createdAt");
						expect(res).toHaveProperty("updatedAt");
						expect(res).toHaveProperty("name");
						expect(res).toHaveProperty("emailVerified");
						expect(res).toHaveProperty("image");
						expect(res).not.toHaveProperty("email_address");
					});
				expect(parameters).toHaveProperty("data");
				expect(parameters.data).toHaveProperty("email_address");
				expect(parameters.data).not.toHaveProperty("email");
				expect(parameters.data.email_address).toEqual("test@test.com");
			});

			test("Should expect the result to respect the select fields", async () => {
				const adapter = await createTestAdapter({
					config: {
						debugLogs: {},
					},
					options: {
						user: {
							fields: {
								email: "email_address",
							},
						},
					},
				});
				const res = await adapter.create({
					model: "user",
					data: {
						email: "test@test.com",
						name: "test-name",
						emailVerified: false,
						image: "test-image",
						id: "test-id",
					},
					select: ["email", "id"],
				});
				expect(res).toHaveProperty("email");
				expect(res).toHaveProperty("id");
				expect(res).not.toHaveProperty("name");
				expect(res).not.toHaveProperty("emailVerified");
				expect(res).not.toHaveProperty("image");
				expect(res).toMatchSnapshot();
			});
		});

		describe("update", () => {
			test("Should fill in the missing fields in the result", async () => {
				const id = generateId();
				const user = await adapter.create({
					model: "user",
					data: { name: "test-name", id },
				});
				const res = await adapter.update({
					model: "user",
					where: [{ field: "id", value: user.id }],
					update: { name: "test-name-2" },
				});
				expect(res).toHaveProperty("id");
				expect(res).toHaveProperty("name");
				expect(res).toHaveProperty("email");
				expect(res).toHaveProperty("emailVerified");
				expect(res).toHaveProperty("image");
				expect(res).toHaveProperty("createdAt");
				expect(res).toHaveProperty("updatedAt");
			});

			test(`Should include an "id" in the result in all cases`, async () => {
				const id = generateId();
				const user = await adapter.create({
					model: "user",
					data: { name: "test-name", id },
				});
				const res: { id: string } | null = await adapter.update({
					model: "user",
					where: [{ field: "id", value: user.id }],
					update: { name: "test-name-2" },
				});
				expect(res).toHaveProperty("id");
			});

			test("Should modify boolean type to 1 or 0 if the DB doesn't support it. And expect the result to be transformed back to boolean", async () => {
				// Testing true
				const updateTRUEParameters: { update: { emailVerified: number } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsBooleans: false,
							},
							adapter(args_0) {
								return {
									async update(data) {
										r(data as any);
										return data.update;
									},
								};
							},
						});
						const user = await adapter.create({
							model: "user",
							data: { emailVerified: false, id: "test-bool-user-update" },
						});
						const res = await adapter.update({
							model: "user",
							where: [{ field: "id", value: user.id }],
							update: { emailVerified: true },
						});
						expect(res).toHaveProperty("emailVerified");
						//@ts-ignore
						expect(res.emailVerified).toBe(true);
					});
				expect(updateTRUEParameters.update).toHaveProperty("emailVerified");
				//@ts-ignore
				expect(updateTRUEParameters.update.emailVerified).toBe(1);

				// Testing false
				const createFALSEParameters: { update: { emailVerified: number } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsBooleans: false,
							},
							adapter(args_0) {
								return {
									async update(data) {
										r(data as any);
										return data.update;
									},
								};
							},
						});
						const user = await adapter.create({
							model: "user",
							data: { emailVerified: true, id: "test-bool-user-update-2" },
						});
						const res = await adapter.update({
							model: "user",
							where: [{ field: "id", value: user.id }],
							update: { emailVerified: false },
						});
						expect(res).toHaveProperty("emailVerified");
						//@ts-ignore
						expect(res.emailVerified).toBe(false);
					});
				expect(createFALSEParameters.update).toHaveProperty("emailVerified");
				//@ts-ignore
				expect(createFALSEParameters.update.emailVerified).toBe(0);
			});

			test("Should modify JSON type to TEXT if the DB doesn't support it. And expect the result to be transformed back to JSON", async () => {
				const createJSONParameters: { update: { preferences: string } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsJSON: false,
							},
							options: {
								user: {
									additionalFields: {
										preferences: {
											//@ts-expect-error - Not *technically* implemented yet, however the `createAdapter` helper already supports it.
											type: "json",
										},
									},
								},
							},
							adapter(args_0) {
								return {
									async update(data) {
										r(data as any);
										return data.update;
									},
								};
							},
						});
						const obj = { preferences: { color: "blue", size: "large" } };
						const user = await adapter.create({
							model: "user",
							data: { email: "test@test.com", id: "test-json-user-update" },
						});
						const res: typeof obj | null = await adapter.update({
							model: "user",
							where: [{ field: "id", value: user.id }],
							update: { preferences: obj.preferences },
						});
						expect(res).toHaveProperty("preferences");
						expect(res?.preferences).toEqual(obj.preferences);
					});
				expect(createJSONParameters.update).toHaveProperty("preferences");
				expect(createJSONParameters.update.preferences).toEqual(
					'{"color":"blue","size":"large"}',
				);
			});

			test("Should modify date type to TEXT if the DB doesn't support it. And expect the result to be transformed back to date", async () => {
				const testDate = new Date();
				const createDateParameters: { update: { createdAt: string } } =
					await new Promise(async (r) => {
						const adapter = await createTestAdapter({
							config: {
								supportsDates: false,
							},
							adapter(args_0) {
								return {
									async update(data) {
										r(data as any);
										return data.update;
									},
								};
							},
						});
						const user = await adapter.create({
							model: "user",
							data: { id: "test-date-user-update" },
						});
						const res: { createdAt: Date } | null = await adapter.update({
							model: "user",
							where: [{ field: "id", value: user.id }],
							update: { createdAt: testDate },
						});
						expect(res).toHaveProperty("createdAt");
						expect(res?.createdAt).toBeInstanceOf(Date);
					});
				expect(createDateParameters.update).toHaveProperty("createdAt");
				expect(createDateParameters.update.createdAt).toEqual(
					testDate.toISOString(),
				);
			});

			test("Should allow custom transform input", async () => {
				const createCustomTransformInputParameters: {
					update: { name: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							customTransformInput({ field, data }) {
								if (field === "name") {
									return data.toUpperCase();
								}
								return data;
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const id = generateId();
					const user = await adapter.create({
						model: "user",
						data: { name: "test-name", id },
					});
					const res: { name: string } | null = await adapter.update({
						model: "user",
						where: [{ field: "id", value: user.id }],
						update: { name: "test-name-2" },
					});
					expect(res).toHaveProperty("name");
					expect(res?.name).toEqual("TEST-NAME-2");
				});
				expect(createCustomTransformInputParameters.update).toHaveProperty(
					"name",
				);
				expect(createCustomTransformInputParameters.update.name).toEqual(
					"TEST-NAME-2",
				);
			});

			test("Should allow custom transform output", async () => {
				const createCustomTransformOutputParameters: {
					update: { name: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							customTransformOutput({ field, data }) {
								if (field === "name") {
									return data.toLowerCase();
								}
								return data;
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const id = generateId();
					const user = await adapter.create({
						model: "user",
						data: { name: "TEST-NAME", id },
					});
					const res: { name: string } | null = await adapter.update({
						model: "user",
						where: [{ field: "id", value: user.id }],
						update: { name: "test-name-2" },
					});
					expect(res).toHaveProperty("name");
					expect(res?.name).toEqual("test-name-2");
				});
				expect(createCustomTransformOutputParameters.update).toHaveProperty(
					"name",
				);
				expect(createCustomTransformOutputParameters.update.name).toEqual(
					"test-name-2",
				);
			});

			test("Should allow custom transform input and output", async () => {
				const createCustomTransformInputAndOutputParameters: {
					update: { name: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							customTransformInput({ field, data }) {
								if (field === "name") {
									return data.toUpperCase();
								}
								return data;
							},
							customTransformOutput({ field, data }) {
								if (field === "name") {
									return data.toLowerCase();
								}
								return data;
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const id = generateId();
					const user = await adapter.create({
						model: "user",
						data: { name: "test-name", id },
					});
					const res: { name: string } | null = await adapter.update({
						model: "user",
						where: [{ field: "id", value: user.id }],
						update: { name: "test-name-2" },
					});
					expect(res).toHaveProperty("name");
					expect(res?.name).toEqual("test-name-2");
				});
				expect(
					createCustomTransformInputAndOutputParameters.update,
				).toHaveProperty("name");
				expect(
					createCustomTransformInputAndOutputParameters.update.name,
				).toEqual("test-name-2".toUpperCase());
			});

			test("Should allow custom map input key transformation", async () => {
				const parameters: {
					update: { email_address: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							mapKeysTransformInput() {
								return {
									email: "email_address",
								};
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const user = (await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					})) as { email: string; id: string };

					const res: { email: string } | null = await adapter.update({
						model: "user",
						update: { email: "test2@test.com" },
						where: [{ field: "id", value: user.id }],
					});

					expect(res).toHaveProperty("email");
					expect(res).not.toHaveProperty("email_address");
					expect(res?.email).toEqual(undefined); // The reason it's undefined is because we did transform `email` to `email_address`, however we never transformed `email_address` back to `email`.
				});
				expect(parameters.update).toHaveProperty("email_address");
				expect(parameters.update.email_address).toEqual("test2@test.com");
			});

			test("Should allow custom map output key transformation", async () => {
				const parameters: {
					update: { email: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							mapKeysTransformOutput() {
								return {
									email: "email_address",
								};
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const user = (await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					})) as { email: string; id: string };

					const res: { email_address: string } | null = await adapter.update({
						model: "user",
						update: { email: "test2@test.com" },
						where: [{ field: "id", value: user.id }],
					});

					expect(res).toHaveProperty("email_address");
					expect(res).not.toHaveProperty("email");
					expect(res?.email_address).toEqual("test2@test.com");
				});
				expect(parameters.update).toHaveProperty("email");
				expect(parameters.update).not.toHaveProperty("email_address");
				expect(parameters.update.email).toEqual("test2@test.com");
			});

			test("Should allow custom map input and output key transformation", async () => {
				const parameters: {
					update: { email_address: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
							mapKeysTransformInput() {
								return {
									email: "email_address",
								};
							},
							mapKeysTransformOutput() {
								return {
									email_address: "email",
								};
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const user = (await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					})) as { email: string; id: string };

					const res: { email: string } | null = await adapter.update({
						model: "user",
						update: { email: "test2@test.com" },
						where: [{ field: "id", value: user.id }],
					});

					expect(res).toHaveProperty("email");
					expect(res).not.toHaveProperty("email_address");
					expect(res?.email).toEqual("test2@test.com");
				});
				expect(parameters.update).toHaveProperty("email_address");
				expect(parameters.update).not.toHaveProperty("email");
				expect(parameters.update.email_address).toEqual("test2@test.com");
			});

			test("Should expect the fields to be transformed into the correct field names if customized", async () => {
				const parameters: {
					update: { email_address: string };
				} = await new Promise(async (r) => {
					const adapter = await createTestAdapter({
						config: {
							debugLogs: {},
						},
						options: {
							user: {
								fields: {
									email: "email_address",
								},
							},
						},
						adapter(args_0) {
							return {
								async update(data) {
									r(data as any);
									return data.update;
								},
							};
						},
					});
					const user: { id: string; email: string } = await adapter.create({
						model: "user",
						data: { email: "test@test.com" },
					});
					const res: { email: string } | null = await adapter.update({
						model: "user",
						update: { email: "test2@test.com" },
						where: [{ field: "id", value: user.id }],
					});
					expect(res).toHaveProperty("email");
					expect(res).not.toHaveProperty("email_address");
					expect(res?.email).toEqual("test2@test.com");
				});
				expect(parameters.update).toHaveProperty("email_address");
				expect(parameters.update).not.toHaveProperty("email");
				expect(parameters.update.email_address).toEqual("test2@test.com");
			});
		});
	});
});
