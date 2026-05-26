import { defu } from "defu";
import type { Labels } from "../types";
import { en } from "./en";

export type { Labels };
export { en };

export type LocaleMap = Record<string, Labels>;

const builtInLocales: LocaleMap = { en };

/**
 * Resolve a full `Labels` object for the given locale.
 *
 * Merges in this priority (highest wins):
 *   1. `overrides` (per-component `labels` prop)
 *   2. `customLocales[locale]` (user-provided translations)
 *   3. `builtInLocales[locale]` (shipped translations)
 *   4. `en` (English fallback)
 */
export function resolveLabels(
	locale: string = "en",
	customLocales?: LocaleMap,
	overrides?: Partial<Labels>,
): Labels {
	const base = builtInLocales[locale] ?? en;
	const custom = customLocales?.[locale];

	if (!custom && !overrides) return base;
	return defu(overrides ?? {}, custom ?? {}, base) as Labels;
}
