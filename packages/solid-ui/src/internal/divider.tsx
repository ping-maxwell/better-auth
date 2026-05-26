import type { Theme } from "@better-auth/ui-core";

interface DividerProps {
	text: string;
	theme: Theme;
}

export function Divider(props: DividerProps) {
	return (
		<div class={props.theme.divider}>
			<span class={props.theme.dividerText}>{props.text}</span>
		</div>
	);
}
