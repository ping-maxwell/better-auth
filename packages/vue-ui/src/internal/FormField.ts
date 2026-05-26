import type { Theme } from "@better-auth/ui-core";
import type { PropType } from "vue";
import { defineComponent, h } from "vue";

export const FormField = defineComponent({
	name: "FormField",
	props: {
		label: { type: String, required: true },
		error: { type: String, default: "" },
		theme: { type: Object as PropType<Theme>, required: true },
		name: { type: String, required: true },
		type: { type: String, default: "text" },
		autoComplete: { type: String, default: undefined },
		modelValue: { type: String, default: "" },
		inputMode: { type: String as PropType<string>, default: undefined },
		placeholder: { type: String, default: undefined },
	},
	emits: ["update:modelValue"],
	setup(props, { emit }) {
		return () =>
			h("div", { class: props.theme.formField }, [
				h("label", { for: props.name, class: props.theme.label }, props.label),
				h("input", {
					id: props.name,
					name: props.name,
					type: props.type,
					autocomplete: props.autoComplete,
					class: props.theme.input,
					value: props.modelValue,
					inputmode: props.inputMode,
					placeholder: props.placeholder,
					onInput: (e: Event) =>
						emit("update:modelValue", (e.target as HTMLInputElement).value),
				}),
				props.error ? h("p", { class: props.theme.error }, props.error) : null,
			]);
	},
});
