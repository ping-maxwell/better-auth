import {
	createAdapterFactory,
	type AdapterFactoryCustomizeAdapterCreator,
	type AdapterFactoryOptions,
} from "../adapter-factory";
import type { BetterAuthOptions } from "@better-auth/core";
import type { KyselyDatabaseType } from "./types";
import {
	sql,
	type InsertQueryBuilder,
	type Kysely,
	type UpdateQueryBuilder,
} from "kysely";
import type {
	DBAdapterDebugLogOption,
	DBAdapter,
	Where,
	ResolvedJoin,
} from "@better-auth/core/db/adapter";

interface KyselyAdapterConfig {
	/**
	 * Database type.
	 */
	type?: KyselyDatabaseType;
	/**
	 * Enable debug logs for the adapter
	 *
	 * @default false
	 */
	debugLogs?: DBAdapterDebugLogOption;
	/**
	 * Use plural for table names.
	 *
	 * @default false
	 */
	usePlural?: boolean;
	/**
	 * Whether to execute multiple operations in a transaction.
	 *
	 * If the database doesn't support transactions,
	 * set this to `false` and operations will be executed sequentially.
	 * @default true
	 */
	transaction?: boolean;
}

export const kyselyAdapter = (
	db: Kysely<any>,
	config?: KyselyAdapterConfig,
) => {
	let lazyOptions: BetterAuthOptions | null = null;
	const createCustomAdapter = (
		db: Kysely<any>,
	): AdapterFactoryCustomizeAdapterCreator => {
<<<<<<< HEAD
<<<<<<< HEAD
		return ({ getFieldName, schema, getDefaultModelName }) => {
=======
=======
>>>>>>> 2e6d72b0b (update: kysely working)
		return ({
			getFieldName,
			schema,
			getDefaultFieldName,
			getDefaultModelName,
<<<<<<< HEAD
			getFieldAttributes,
			getModelName,
		}) => {
>>>>>>> 768a04162 (update: fix kysely join bug, exported some db name helpers, improve join tests and fixed kysely generation bug)
=======
		}) => {
>>>>>>> 2e6d72b0b (update: kysely working)
			const withReturning = async (
				values: Record<string, any>,
				builder:
					| InsertQueryBuilder<any, any, any>
					| UpdateQueryBuilder<any, string, string, any>,
				model: string,
				where: Where[],
			) => {
				let res: any;
				if (config?.type === "mysql") {
					// This isn't good, but kysely doesn't support returning in mysql and it doesn't return the inserted id.
					// Change this if there is a better way.
					await builder.execute();
					const field = values.id
						? "id"
						: where.length > 0 && where[0]?.field
							? where[0].field
							: "id";

					if (!values.id && where.length === 0) {
						res = await db
							.selectFrom(model)
							.selectAll()
							.orderBy(getFieldName({ model, field }), "desc")
							.limit(1)
							.executeTakeFirst();
						return res;
					}

					const value = values[field] || where[0]?.value;
					res = await db
						.selectFrom(model)
						.selectAll()
						.orderBy(getFieldName({ model, field }), "desc")
						.where(getFieldName({ model, field }), "=", value)
						.limit(1)
						.executeTakeFirst();
					return res;
				}
				if (config?.type === "mssql") {
					res = await builder.outputAll("inserted").executeTakeFirst();
					return res;
				}
				res = await builder.returningAll().executeTakeFirst();
				return res;
			};
			function transformValueToDB(value: any, model: string, field: string) {
				if (field === "id") {
					return value;
				}
				const { type = "sqlite" } = config || {};
				let f = schema[model]?.fields[field];
				if (!f) {
					//@ts-expect-error - The model name can be a sanitized, thus using the custom model name, not one of the default ones.
					f = Object.values(schema).find((f) => f.modelName === model)!;
				}
				if (
					f!.type === "boolean" &&
					(type === "sqlite" || type === "mssql") &&
					value !== null &&
					value !== undefined
				) {
					return value ? 1 : 0;
				}
				if (f!.type === "date" && value && value instanceof Date) {
					if (type === "sqlite") return value.toISOString();
					return value;
				}
				return value;
			}

			function transformValueFromDB(value: any) {
				function transformObject(obj: any) {
					for (const key in obj) {
						if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

						const field = obj[key];

						if (field instanceof Date && config?.type === "mysql") {
							// obj[key] = ensureUTC(field);
						} else if (typeof field === "object" && field !== null) {
							transformObject(field);
						}
					}
				}

				if (Array.isArray(value)) {
					for (let i = 0; i < value.length; i++) {
						const item = value[i];
						if (typeof item === "object" && item !== null) {
							transformObject(item);
						}
					}
				} else if (typeof value === "object" && value !== null) {
					transformObject(value);
				}

				return value;
			}

			function convertWhereClause(model: string, w?: Where[]) {
				if (!w)
					return {
						and: null,
						or: null,
					};

				const conditions = {
					and: [] as any[],
					or: [] as any[],
				};

				w.forEach((condition) => {
					let {
						field: _field,
						value,
						operator = "=",
						connector = "AND",
					} = condition;
<<<<<<< HEAD
					const field = getFieldName({ model, field: _field });
					value = transformValueToDB(value, model, _field);
=======
					let value: any = _value;
					let field: string | any = getFieldName({
						model,
						field: _field,
					});

>>>>>>> 2cdd8c879 (update: progress)
					const expr = (eb: any) => {
						if (operator.toLowerCase() === "in") {
							return eb(field, "in", Array.isArray(value) ? value : [value]);
						}

						if (operator.toLowerCase() === "not_in") {
							return eb(
								field,
								"not in",
								Array.isArray(value) ? value : [value],
							);
						}

						if (operator === "contains") {
							return eb(`${model}.${field}`, "like", `%${value}%`);
						}

						if (operator === "starts_with") {
							return eb(`${model}.${field}`, "like", `${value}%`);
						}

						if (operator === "ends_with") {
							return eb(`${model}.${field}`, "like", `%${value}`);
						}

						if (operator === "eq") {
							return eb(`${model}.${field}`, "=", value);
						}

						if (operator === "ne") {
							return eb(`${model}.${field}`, "<>", value);
						}

						if (operator === "gt") {
							return eb(`${model}.${field}`, ">", value);
						}

						if (operator === "gte") {
							return eb(`${model}.${field}`, ">=", value);
						}

						if (operator === "lt") {
							return eb(`${model}.${field}`, "<", value);
						}

						if (operator === "lte") {
							return eb(`${model}.${field}`, "<=", value);
						}

						return eb(`${model}.${field}`, operator, value);
					};

					if (connector === "OR") {
						conditions.or.push(expr);
					} else {
						conditions.and.push(expr);
					}
				});

				return {
					and: conditions.and.length ? conditions.and : null,
					or: conditions.or.length ? conditions.or : null,
				};
			}
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 2e6d72b0b (update: kysely working)

			// Helper function to process joined results
			function processJoinedResults(
				rows: any[],
				baseModel: string,
<<<<<<< HEAD
				joinConfig: ResolvedJoin | undefined,
				allSelectsStr: { joinModel: string; fieldName: string }[],
=======
				joinConfig: Record<string, any> | undefined,
				allSelectsStr: string[],
>>>>>>> 2e6d72b0b (update: kysely working)
			) {
				if (!joinConfig || !rows.length) {
					return rows;
				}

				// Group rows by main model ID
				const groupedByMainId = new Map<string, any>();

				for (const currentRow of rows) {
					// Separate main model columns from joined columns
					const mainModelFields: Record<string, any> = {};
					const joinedModelFields: Record<string, Record<string, any>> = {};

					// Initialize joined model fields map
					for (const [joinModel] of Object.entries(joinConfig)) {
<<<<<<< HEAD
						joinedModelFields[getModelName(joinModel)] = {};
=======
						joinedModelFields[joinModel] = {};
>>>>>>> 2e6d72b0b (update: kysely working)
					}

					// Distribute all columns - collect complete objects per model
					for (const [key, value] of Object.entries(currentRow)) {
						const keyStr = String(key);
						let assigned = false;

						// Check if this is a joined column
<<<<<<< HEAD
<<<<<<< HEAD
						for (const { joinModel, fieldName } of allSelectsStr) {
							if (keyStr === `_joined_${joinModel}_${fieldName}`) {
								joinedModelFields[getModelName(joinModel)]![
									getFieldName({
										model: joinModel,
										field: fieldName,
									})
								] = value;
=======
=======
>>>>>>> 2e6d72b0b (update: kysely working)
						for (const selectStr of allSelectsStr) {
							if (keyStr === selectStr) {
								// Extract joinModel and fieldName from the key
								// Format: joined_<joinModel>_<fieldName>
<<<<<<< HEAD
								const parts = keyStr.substring(8).split("_"); // Remove "_joined_" prefix
=======
								const parts = keyStr.substring(7).split("_"); // Remove "joined_" prefix
>>>>>>> 2e6d72b0b (update: kysely working)
								const joinModel = parts[0]!;
								const fieldName = parts.slice(1).join("_");

								if (joinedModelFields[joinModel]) {
									joinedModelFields[joinModel][fieldName] = value;
								}
<<<<<<< HEAD
>>>>>>> 12fb44e30 (update: make kysely joins start with underscore)
=======
>>>>>>> 2e6d72b0b (update: kysely working)
								assigned = true;
								break;
							}
						}

						if (!assigned) {
							mainModelFields[key] = value;
						}
					}

					const mainId = mainModelFields.id;
					if (!mainId) continue;

					// Initialize or get existing entry for this main model
					if (!groupedByMainId.has(mainId)) {
						const entry: Record<string, any> = { ...mainModelFields };

						// Initialize joined models based on uniqueness
						for (const [joinModel, joinAttr] of Object.entries(joinConfig)) {
							const defaultModelName = getDefaultModelName(joinModel);
							const fields = schema[defaultModelName]?.fields;
							if (!fields) continue;
<<<<<<< HEAD
							const joinFieldAttr = getFieldAttributes({
								model: defaultModelName,
								field: joinAttr.on.to,
							});
							const isUnique = joinFieldAttr?.unique ?? false;
							entry[getModelName(joinModel)] = isUnique ? null : [];
=======
							const joinFieldAttr = fields[joinAttr.on.to];
							const isUnique = joinFieldAttr?.unique ?? false;
							entry[defaultModelName] = isUnique ? null : [];
>>>>>>> 2e6d72b0b (update: kysely working)
						}

						groupedByMainId.set(mainId, entry);
					}

					const entry = groupedByMainId.get(mainId)!;

					// Add joined records to the entry
					for (const [joinModel, joinAttr] of Object.entries(joinConfig)) {
						const defaultModelName = getDefaultModelName(joinModel);
<<<<<<< HEAD
						const joinFieldAttr = getFieldAttributes({
							model: defaultModelName,
							field: joinAttr.on.to,
						});
						const isUnique = joinFieldAttr?.unique ?? false;

						const joinedObj = joinedModelFields[getModelName(joinModel)];
						if (isUnique) {
							entry[getModelName(joinModel)] = joinedObj;
						} else {
							// For arrays, append if not already there (deduplicate by id)
							if (
								Array.isArray(entry[getModelName(defaultModelName)]) &&
								joinedObj?.id
							) {
								if (
									!entry[getModelName(defaultModelName)].some(
										(item: any) => item.id === joinedObj.id,
									)
								) {
									entry[getModelName(defaultModelName)].push(joinedObj);
=======
						const fields = schema[defaultModelName]?.fields;
						const joinFieldAttr = fields?.[joinAttr.on.to];
						const isUnique = joinFieldAttr?.unique ?? false;

						const joinedObj = joinedModelFields[joinModel];

						if (isUnique) {
							entry[defaultModelName] = joinedObj;
						} else {
							// For arrays, append if not already there (deduplicate by id)
							if (Array.isArray(entry[defaultModelName]) && joinedObj?.id) {
								if (
									!entry[defaultModelName].some(
										(item: any) => item.id === joinedObj.id,
									)
								) {
									entry[defaultModelName].push(joinedObj);
>>>>>>> 2e6d72b0b (update: kysely working)
								}
							}
						}
					}
				}

				return Array.from(groupedByMainId.values());
			}
<<<<<<< HEAD
>>>>>>> 768a04162 (update: fix kysely join bug, exported some db name helpers, improve join tests and fixed kysely generation bug)
=======
>>>>>>> 2e6d72b0b (update: kysely working)
			return {
				async create({ data, model }) {
					const builder = db.insertInto(model).values(data);
					const returned = await withReturning(data, builder, model, []);
					return transformValueFromDB(returned) as any;
				},
				async findOne({ model, where, select, join }) {
					const { and, or } = convertWhereClause(model, where);
<<<<<<< HEAD
<<<<<<< HEAD
					let query = db.selectFrom(model).selectAll();
=======
					let query: any = db.selectFrom(model).selectAll(model);

					// Apply where conditions first
>>>>>>> 2e6d72b0b (update: kysely working)
=======
					let query: any = db.selectFrom(model);

					// Apply where conditions first
>>>>>>> 2cdd8c879 (update: progress)
					if (and) {
						query = query.where((eb: any) =>
							eb.and(and.map((expr: any) => expr(eb))),
						);
					}
					if (or) {
						query = query.where((eb: any) =>
							eb.or(or.map((expr: any) => expr(eb))),
						);
					}
<<<<<<< HEAD
<<<<<<< HEAD
					const res = await query.executeTakeFirst();
					if (!res) return null;
					return transformValueFromDB(res) as any;
=======

					if (join) {
						// Add joins
						for (const [joinModel, joinAttr] of Object.entries(join)) {
							if (joinAttr.type === "inner") {
								query = query.innerJoin(
									joinModel,
									`${joinModel}.${joinAttr.on.to}`,
									`${model}.${joinAttr.on.from}`,
								);
							} else {
								query = query.leftJoin(
									joinModel,
									`${joinModel}.${joinAttr.on.to}`,
									`${model}.${joinAttr.on.from}`,
								);
							}
						}
					}

					// Use selectAll which will handle column naming appropriately
					const allSelects: RawBuilder<unknown>[] = [];
<<<<<<< HEAD
					const allSelectsStr: { joinModel: string; fieldName: string }[] = [];
					if (join) {
						for (const [joinModel, _] of Object.entries(join)) {
							const fields = schema[getDefaultModelName(joinModel)]?.fields;
							if (!fields) continue;
							fields.id = { type: "string" }; // make sure there is at least an id field
							for (const [field, fieldAttr] of Object.entries(fields)) {
								allSelects.push(
									sql`${sql.ref(joinModel)}.${sql.ref(fieldAttr.fieldName || field)} as ${sql.ref(`_joined_${joinModel}_${fieldAttr.fieldName || field}`)}`,
<<<<<<< HEAD
=======
								);
								allSelectsStr.push(
									`_joined_${joinModel}_${fieldAttr.fieldName || field}`,
>>>>>>> 12fb44e30 (update: make kysely joins start with underscore)
								);
								allSelectsStr.push({
									joinModel,
									fieldName: fieldAttr.fieldName || field,
								});
							}
						}
						query = query.select(allSelects);
					}

					const res = await query.execute();
					if (!res || !Array.isArray(res) || res.length === 0) return null;

					// Get the first row from the result array
					const row = res[0];

					if (join) {
						const result: Record<string, any> = {};

						// Initialize structure for joined models
						for (const [joinModel, joinAttr] of Object.entries(join)) {
							const fields = schema[getDefaultModelName(joinModel)]?.fields;
							if (!fields) continue;
							const joinFieldAttr = fields[joinAttr.on.to];
							const isUnique = joinFieldAttr?.unique ?? false;
							result[getDefaultModelName(joinModel)] = isUnique ? null : [];
						}

						// Process ALL rows and collect joined records
						const processedRows = processJoinedResults(
							res,
							model,
							join,
							allSelectsStr,
						);

						return processedRows[0] as any;
					}

					return row as any;
>>>>>>> 768a04162 (update: fix kysely join bug, exported some db name helpers, improve join tests and fixed kysely generation bug)
=======
					const allSelectsStr: string[] = [];
					if (join) {
						for (const [joinModel, _] of Object.entries(join)) {
							const fields = schema[getDefaultModelName(joinModel)]?.fields;
							if (!fields) continue;
							fields.id = { type: "string" }; // make sure there is at least an id field
							for (const [field, fieldAttr] of Object.entries(fields)) {
								allSelects.push(
									sql`${sql.ref(joinModel)}.${sql.ref(fieldAttr.fieldName || field)} as ${sql.ref(`joined_${joinModel}_${fieldAttr.fieldName || field}`)}`,
								);
								allSelectsStr.push(
									`joined_${joinModel}_${fieldAttr.fieldName || field}`,
								);
							}
						}
						query = query.select(allSelects);
					}

					const res = await query.execute();
					if (!res || !Array.isArray(res) || res.length === 0) return null;

					// Get the first row from the result array
					const row = res[0];

					if (join) {
						const result: Record<string, any> = {};

						// Initialize structure for joined models
						for (const [joinModel, joinAttr] of Object.entries(join)) {
							const fields = schema[getDefaultModelName(joinModel)]?.fields;
							if (!fields) continue;
							const joinFieldAttr = fields[joinAttr.on.to];
							const isUnique = joinFieldAttr?.unique ?? false;
							result[getDefaultModelName(joinModel)] = isUnique ? null : [];
						}

						// Process ALL rows and collect joined records
						const processedRows = processJoinedResults(
							res,
							model,
							join,
							allSelectsStr,
						);

						return processedRows[0] as any;
					}

					return row as any;
>>>>>>> 2e6d72b0b (update: kysely working)
=======

					if (join) {
						// Add joins
						for (const [joinModel, joinAttr] of Object.entries(join)) {
							if (joinAttr.type === "inner") {
								query = query.innerJoin(
									joinModel,
									`${joinModel}.${joinAttr.on.to}`,
									`${model}.${joinAttr.on.from}`,
								);
							} else {
								query = query.leftJoin(
									joinModel,
									`${joinModel}.${joinAttr.on.to}`,
									`${model}.${joinAttr.on.from}`,
								);
							}
						}
					}

					// Use selectAll which will handle column naming appropriately
					// query = query.select([
					// 	sql`${sql.ref(model)}.*`,
					// 	...(join
					// 		? Object.keys(join).map(
					// 				(joinModel) => sql`${sql.ref(joinModel)}.*`,
					// 			)
					// 		: []),
					// ]);

					console.log(4, query.compile());

					const res = await query.executeTakeFirst();
					if (!res) return null;

					if (join) {
						// Restructure the flattened result
						// Kysely returns columns as `${table}_${column}` when there are joins
						const result: Record<string, any> = {};

						// Initialize objects for each model
						result[model] = {};
						for (const [joinModel] of Object.entries(join)) {
							result[joinModel] = {};
						}

						// Distribute columns
						for (const [key, value] of Object.entries(res)) {
							const keyStr = String(key).toLowerCase();
							let assigned = false;

							// Check if key is prefixed with a joined model name
							for (const [joinModel] of Object.entries(join)) {
								const prefix = `${joinModel}_`.toLowerCase();
								if (keyStr.startsWith(prefix)) {
									const colName = String(key).substring(joinModel.length + 1);
									result[joinModel]![colName] = value;
									assigned = true;
									break;
								}
							}

							// If not a prefixed column, assign to main model
							if (!assigned) {
								result[model]![key] = value;
							}
						}

						console.log(3, result);
						return result;
					}

					return res as any;
>>>>>>> 2cdd8c879 (update: progress)
				},
				async findMany({ model, where, limit, offset, sortBy, join }) {
					const { and, or } = convertWhereClause(model, where);
<<<<<<< HEAD
<<<<<<< HEAD
					let query = db.selectFrom(model);
=======
					let query: any = db.selectFrom(model).selectAll(model);

					// Apply where conditions
>>>>>>> 2e6d72b0b (update: kysely working)
=======
					let query: any = db.selectFrom(model);

					// Apply where conditions
>>>>>>> 2cdd8c879 (update: progress)
					if (and) {
						query = query.where((eb: any) =>
							eb.and(and.map((expr: any) => expr(eb))),
						);
					}
					if (or) {
						query = query.where((eb: any) =>
							eb.or(or.map((expr: any) => expr(eb))),
						);
					}

					if (join) {
						// Add joins
						for (const [joinModel, joinAttr] of Object.entries(join)) {
							if (joinAttr.type === "inner") {
								query = query.innerJoin(
									joinModel,
									`${joinModel}.${joinAttr.on.to}`,
									`${model}.${joinAttr.on.from}`,
								);
							} else {
								query = query.leftJoin(
									joinModel,
									`${joinModel}.${joinAttr.on.to}`,
									`${model}.${joinAttr.on.from}`,
								);
							}
						}
					}

					if (config?.type === "mssql") {
						if (!offset) {
							query = query.top(limit || 100);
						}
					} else {
						query = query.limit(limit || 100);
					}

					if (sortBy) {
						query = query.orderBy(
							getFieldName({ model, field: sortBy.field }),
							sortBy.direction,
						);
					}

					if (offset) {
						if (config?.type === "mssql") {
							if (!sortBy) {
								query = query.orderBy(getFieldName({ model, field: "id" }));
							}
							query = query.offset(offset).fetch(limit || 100);
						} else {
							query = query.offset(offset);
						}
					}

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
					const res = await query.selectAll().execute();
=======
					// Use selectAll which will handle column naming appropriately
					const allSelects: RawBuilder<unknown>[] = [];
					const allSelectsStr: { joinModel: string; fieldName: string }[] = [];
					if (join) {
						for (const [joinModel, _] of Object.entries(join)) {
							const fields = schema[getDefaultModelName(joinModel)]?.fields;
							if (!fields) continue;
							fields.id = { type: "string" }; // make sure there is at least an id field
							for (const [field, fieldAttr] of Object.entries(fields)) {
								allSelects.push(
									sql`${sql.ref(joinModel)}.${sql.ref(fieldAttr.fieldName || field)} as ${sql.ref(`_joined_${joinModel}_${fieldAttr.fieldName || field}`)}`,
<<<<<<< HEAD
=======
								);
								allSelectsStr.push(
									`_joined_${joinModel}_${fieldAttr.fieldName || field}`,
>>>>>>> 12fb44e30 (update: make kysely joins start with underscore)
								);
								allSelectsStr.push({
									joinModel,
									fieldName: fieldAttr.fieldName || field,
								});
							}
						}
						query = query.select(allSelects);
=======
					// Use selectAll which will handle column naming appropriately
					const allSelects: RawBuilder<unknown>[] = [];
					const allSelectsStr: string[] = [];
					if (join) {
						for (const [joinModel, _] of Object.entries(join)) {
							const fields = schema[getDefaultModelName(joinModel)]?.fields;
							if (!fields) continue;
							fields.id = { type: "string" }; // make sure there is at least an id field
							for (const [field, fieldAttr] of Object.entries(fields)) {
								allSelects.push(
									sql`${sql.ref(joinModel)}.${sql.ref(fieldAttr.fieldName || field)} as ${sql.ref(`joined_${joinModel}_${fieldAttr.fieldName || field}`)}`,
								);
								allSelectsStr.push(
									`joined_${joinModel}_${fieldAttr.fieldName || field}`,
								);
							}
						}
						query = query.select(allSelects);
					}
=======
					query = query.selectAll();
>>>>>>> 2cdd8c879 (update: progress)

					const res = await query.execute();
					if (!res) return [];

					if (join) {
						// Process results and restructure them
<<<<<<< HEAD
						const processedRows = processJoinedResults(
							res,
							model,
							join,
							allSelectsStr,
						);
						return processedRows;
>>>>>>> 2e6d72b0b (update: kysely working)
					}

					const res = await query.execute();
>>>>>>> 768a04162 (update: fix kysely join bug, exported some db name helpers, improve join tests and fixed kysely generation bug)
					if (!res) return [];
					return transformValueFromDB(res) as any;
=======
						const results = [];

						for (const row of res) {
							const result: Record<string, any> = {};

							// Initialize objects for each model
							result[model] = {};
							for (const [joinModel] of Object.entries(join)) {
								result[joinModel] = {};
							}

							// Distribute columns
							for (const [key, value] of Object.entries(row)) {
								const keyStr = String(key).toLowerCase();
								let assigned = false;

								// Check if key is prefixed with a joined model name
								for (const [joinModel] of Object.entries(join)) {
									const prefix = `${joinModel}_`.toLowerCase();
									if (keyStr.startsWith(prefix)) {
										const colName = String(key).substring(joinModel.length + 1);
										result[joinModel]![colName] = value;
										assigned = true;
										break;
									}
								}

								// If not a prefixed column, assign to main model
								if (!assigned) {
									result[model]![key] = value;
								}
							}

							results.push(result);
						}

						return results;
					}

					return res as any;
>>>>>>> 2cdd8c879 (update: progress)
				},
				async update({ model, where, update: values }) {
					const { and, or } = convertWhereClause(model, where);

					let query = db.updateTable(model).set(values as any);
					if (and) {
						query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					}
					if (or) {
						query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					}
					return transformValueFromDB(
						await withReturning(values as any, query, model, where),
					);
				},
				async updateMany({ model, where, update: values }) {
					const { and, or } = convertWhereClause(model, where);
					let query = db.updateTable(model).set(values as any);
					if (and) {
						query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					}
					if (or) {
						query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					}
					const res = await query.execute();
					return res.length;
				},
				async count({ model, where }) {
					const { and, or } = convertWhereClause(model, where);
					let query = db
						.selectFrom(model)
						// a temporal solution for counting other than "*" - see more - https://www.sqlite.org/quirks.html#double_quoted_string_literals_are_accepted
						.select(db.fn.count("id").as("count"));
					if (and) {
						query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					}
					if (or) {
						query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					}
					const res = await query.execute();
					if (typeof res[0]!.count === "number") {
						return res[0]!.count;
					}
					if (typeof res[0]!.count === "bigint") {
						return Number(res[0]!.count);
					}
					return parseInt(res[0]!.count);
				},
				async delete({ model, where }) {
					const { and, or } = convertWhereClause(model, where);
					let query = db.deleteFrom(model);
					if (and) {
						query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					}

					if (or) {
						query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					}
					await query.execute();
				},
				async deleteMany({ model, where }) {
					const { and, or } = convertWhereClause(model, where);
					let query = db.deleteFrom(model);
					if (and) {
						query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					}
					if (or) {
						query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					}
					return (await query.execute()).length;
				},
				options: config,
			};
		};
	};
	let adapterOptions: AdapterFactoryOptions | null = null;
	adapterOptions = {
		config: {
			adapterId: "kysely",
			adapterName: "Kysely Adapter",
			usePlural: config?.usePlural,
			debugLogs: config?.debugLogs,
			supportsBooleans:
				config?.type === "sqlite" ||
				config?.type === "mssql" ||
				config?.type === "mysql" ||
				!config?.type
					? false
					: true,
			supportsDates:
				config?.type === "sqlite" || config?.type === "mssql" || !config?.type
					? false
					: true,
			supportsJSON: false,
			transaction:
				(config?.transaction ?? false)
					? (cb) =>
							db.transaction().execute((trx) => {
								const adapter = createAdapterFactory({
									config: adapterOptions!.config,
									adapter: createCustomAdapter(trx),
								})(lazyOptions!);
								return cb(adapter);
							})
					: false,
		},
		adapter: createCustomAdapter(db),
	};

	const adapter = createAdapterFactory(adapterOptions);

	return (options: BetterAuthOptions): DBAdapter<BetterAuthOptions> => {
		lazyOptions = options;
		return adapter(options);
	};
};
