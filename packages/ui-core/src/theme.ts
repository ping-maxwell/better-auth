import { defu } from "defu";
import type { Theme } from "./types";

export const defaultTheme: Theme = {
	card: "ba-mx-auto ba-w-full ba-max-w-md ba-rounded-xl ba-border ba-border-zinc-200 ba-bg-white ba-p-8 ba-shadow-lg dark:ba-border-zinc-800 dark:ba-bg-zinc-950",
	cardHeader: "ba-mb-6 ba-text-center",
	cardTitle:
		"ba-text-2xl ba-font-semibold ba-tracking-tight ba-text-zinc-900 dark:ba-text-zinc-50",
	cardDescription: "ba-mt-1 ba-text-sm ba-text-zinc-500 dark:ba-text-zinc-400",
	cardContent: "ba-space-y-4",
	cardFooter:
		"ba-mt-6 ba-text-center ba-text-sm ba-text-zinc-500 dark:ba-text-zinc-400",
	input:
		"ba-flex ba-h-10 ba-w-full ba-rounded-md ba-border ba-border-zinc-300 ba-bg-white ba-px-3 ba-py-2 ba-text-sm ba-text-zinc-900 ba-outline-none ba-ring-offset-white ba-transition-colors placeholder:ba-text-zinc-400 focus:ba-border-zinc-400 focus:ba-ring-2 focus:ba-ring-zinc-200 disabled:ba-cursor-not-allowed disabled:ba-opacity-50 dark:ba-border-zinc-700 dark:ba-bg-zinc-900 dark:ba-text-zinc-50 dark:ba-ring-offset-zinc-950 dark:placeholder:ba-text-zinc-500 dark:focus:ba-border-zinc-600 dark:focus:ba-ring-zinc-800",
	label:
		"ba-text-sm ba-font-medium ba-leading-none ba-text-zinc-700 dark:ba-text-zinc-300",
	button: {
		primary:
			"ba-inline-flex ba-h-10 ba-w-full ba-items-center ba-justify-center ba-gap-2 ba-rounded-md ba-bg-zinc-900 ba-px-4 ba-text-sm ba-font-medium ba-text-white ba-transition-colors hover:ba-bg-zinc-800 focus-visible:ba-outline-none focus-visible:ba-ring-2 focus-visible:ba-ring-zinc-400 disabled:ba-pointer-events-none disabled:ba-opacity-50 dark:ba-bg-zinc-50 dark:ba-text-zinc-900 dark:hover:ba-bg-zinc-200 dark:focus-visible:ba-ring-zinc-600",
		social:
			"ba-inline-flex ba-h-10 ba-w-full ba-items-center ba-justify-center ba-gap-2 ba-rounded-md ba-border ba-border-zinc-300 ba-bg-white ba-px-4 ba-text-sm ba-font-medium ba-text-zinc-700 ba-transition-colors hover:ba-bg-zinc-50 focus-visible:ba-outline-none focus-visible:ba-ring-2 focus-visible:ba-ring-zinc-400 disabled:ba-pointer-events-none disabled:ba-opacity-50 dark:ba-border-zinc-700 dark:ba-bg-zinc-900 dark:ba-text-zinc-300 dark:hover:ba-bg-zinc-800 dark:focus-visible:ba-ring-zinc-600",
		link: "ba-inline-flex ba-items-center ba-text-sm ba-font-medium ba-text-zinc-900 ba-underline-offset-4 hover:ba-underline dark:ba-text-zinc-50",
	},
	error: "ba-text-sm ba-text-red-600 dark:ba-text-red-400",
	divider:
		"ba-relative ba-flex ba-items-center ba-py-4 before:ba-flex-1 before:ba-border-t before:ba-border-zinc-200 after:ba-flex-1 after:ba-border-t after:ba-border-zinc-200 dark:before:ba-border-zinc-800 dark:after:ba-border-zinc-800",
	dividerText:
		"ba-mx-3 ba-text-xs ba-uppercase ba-text-zinc-400 dark:ba-text-zinc-500",
	link: "ba-font-medium ba-text-zinc-900 hover:ba-underline dark:ba-text-zinc-50",
	socialButtonsContainer: "ba-grid ba-grid-cols-1 ba-gap-2 sm:ba-grid-cols-2",
	formField: "ba-space-y-2",
};

/**
 * Deep-merge user theme overrides onto the default theme.
 */
export function mergeTheme(overrides?: Partial<Theme>): Theme {
	if (!overrides) return defaultTheme;
	return defu(overrides, defaultTheme) as Theme;
}
