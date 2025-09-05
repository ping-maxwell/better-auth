import type { BetterAuthOptions } from "../../types";
import { initGetDefaultFieldName } from "./get-default-field-name";
import { initGetDefaultModelName } from "./get-default-model-name";
import { initGetFieldAttributes } from "./get-field-attributes";
import { initGetFieldName } from "./get-field-name";
import { initGetModelName } from "./get-model-name";
import { initIdField } from "./id-field";
import { initTransformInput } from "./transform-input";
import { initTransformOutput } from "./transform-output";
import { initTransformWhere } from "./transform-where";
import type { AdapterConfig } from "./types";

export const initAdapterUtils = ({
	schema,
	debugLog,
	config,
	options,
}: {
	schema: Record<string, any>;
	debugLog: (data: any) => void;
	config: AdapterConfig;
	options: BetterAuthOptions;
}) => {
	const getDefaultModelName = initGetDefaultModelName({
		schema,
		debugLog,
		config,
	});
	const getDefaultFieldName = initGetDefaultFieldName({
		schema,
		debugLog,
		getDefaultModelName,
	});
	const getModelName = initGetModelName({
		config,
		getDefaultModelName,
		schema,
	});
	const getFieldName = initGetFieldName({
		getDefaultFieldName,
		getDefaultModelName,
		schema,
	});
	const idField = initIdField({ config, options, getDefaultModelName });
	const getFieldAttributes = initGetFieldAttributes({
		getDefaultFieldName,
		getDefaultModelName,
		idField,
		schema,
	});
	const transformInput = initTransformInput({
		schema,
		config,
		options,
		idField,
	});
	const transformOutput = initTransformOutput({
		schema,
		config,
		options,
	});
	const transformWhereClause = initTransformWhere({
		config,
		getDefaultFieldName,
		getDefaultModelName,
		getFieldAttributes,
		getFieldName,
		options,
	});
	return {
		getDefaultModelName,
		getModelName,
		getDefaultFieldName,
		getFieldName,
		getFieldAttributes,
		transformInput,
		transformOutput,
		transformWhereClause,
	};
};
