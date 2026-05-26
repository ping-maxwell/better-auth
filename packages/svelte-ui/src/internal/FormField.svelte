<script lang="ts">
import type { Theme } from "@better-auth/ui-core";

interface Props {
	label: string;
	error?: string | undefined;
	theme: Theme;
	name: string;
	type?: string;
	autocomplete?: string;
	inputmode?: string;
	placeholder?: string;
	value?: string;
	oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
}

let {
	label,
	error = undefined,
	theme,
	name,
	type = "text",
	autocomplete = undefined,
	inputmode = undefined,
	placeholder = undefined,
	value = "",
	oninput = undefined,
}: Props = $props();
</script>

<div class={theme.formField}>
	<label for={name} class={theme.label}>{label}</label>
	<input
		id={name}
		{name}
		{type}
		{autocomplete}
		{inputmode}
		{placeholder}
		{value}
		{oninput}
		class={theme.input}
	/>
	{#if error}
		<p class={theme.error}>{error}</p>
	{/if}
</div>
