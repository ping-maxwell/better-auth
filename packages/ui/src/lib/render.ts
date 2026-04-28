import type { UITheme } from "@/types";

export interface RenderDocumentOptions {
	title: string;
	content: string;
	scripts?: string[];
	theme?: UITheme;
}

/**
 * Generate CSS variable overrides from theme
 */
function generateThemeCSS(theme: UITheme | undefined): string {
	if (!theme) return "";

	const vars: string[] = [];
	const mapping: Record<string, string> = {
		background: "--background",
		foreground: "--foreground",
		card: "--card",
		cardForeground: "--card-foreground",
		popover: "--popover",
		popoverForeground: "--popover-foreground",
		primary: "--primary",
		primaryForeground: "--primary-foreground",
		secondary: "--secondary",
		secondaryForeground: "--secondary-foreground",
		muted: "--muted",
		mutedForeground: "--muted-foreground",
		accent: "--accent",
		accentForeground: "--accent-foreground",
		destructive: "--destructive",
		destructiveForeground: "--destructive-foreground",
		border: "--border",
		input: "--input",
		ring: "--ring",
		radius: "--radius",
	};

	for (const [key, cssVar] of Object.entries(mapping)) {
		const value = theme[key as keyof UITheme];
		if (value && typeof value === "string") {
			if (key === "radius") {
				vars.push(`${cssVar}: ${value}rem`);
			} else {
				vars.push(`${cssVar}: ${value}`);
			}
		}
	}

	if (vars.length === 0) return "";

	return `:root { ${vars.join("; ")}; }`;
}

/**
 * Render a complete HTML document with the bundled CSS
 */
export function renderDocument({
	title,
	content,
	scripts = [],
	theme,
}: RenderDocumentOptions): string {
	const themeCSS = generateThemeCSS(theme);

	return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/__better-auth/styles.css">
  ${themeCSS ? `<style>${themeCSS}</style>` : ""}
</head>
<body class="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
  ${content}
  ${scripts.map((script) => `<script>${script}</script>`).join("\n  ")}
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
