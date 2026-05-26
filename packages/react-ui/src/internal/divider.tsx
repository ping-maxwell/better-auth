import type { Theme } from "@better-auth/ui-core";

interface DividerProps {
	text: string;
	theme: Theme;
}

export function Divider({ text, theme }: DividerProps) {
	return (
		<div className={theme.divider}>
			<span className={theme.dividerText}>{text}</span>
		</div>
	);
}
