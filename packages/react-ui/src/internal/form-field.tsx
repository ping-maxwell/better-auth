import type { Theme } from "@better-auth/ui-core";
import type { InputHTMLAttributes } from "react";

interface FormFieldProps {
	label: string;
	error?: string | undefined;
	theme: Theme;
	inputProps: InputHTMLAttributes<HTMLInputElement>;
}

export function FormField({ label, error, theme, inputProps }: FormFieldProps) {
	const id = inputProps.id ?? inputProps.name;
	return (
		<div className={theme.formField}>
			<label htmlFor={id} className={theme.label}>
				{label}
			</label>
			<input {...inputProps} id={id} className={theme.input} />
			{error && <p className={theme.error}>{error}</p>}
		</div>
	);
}
