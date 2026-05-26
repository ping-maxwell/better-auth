import type { Theme } from "@better-auth/ui-core";
import type { JSX } from "solid-js";
import { Show } from "solid-js";

interface FormFieldProps {
	label: string;
	error?: string | undefined;
	theme: Theme;
	inputProps: JSX.InputHTMLAttributes<HTMLInputElement>;
}

export function FormField(props: FormFieldProps) {
	const id = () => props.inputProps.id ?? props.inputProps.name;
	return (
		<div class={props.theme.formField}>
			<label for={id() as string} class={props.theme.label}>
				{props.label}
			</label>
			<input
				{...props.inputProps}
				id={id() as string}
				class={props.theme.input}
			/>
			<Show when={props.error}>
				<p class={props.theme.error}>{props.error}</p>
			</Show>
		</div>
	);
}
