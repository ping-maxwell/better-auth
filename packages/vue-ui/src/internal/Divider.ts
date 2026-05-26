import type { Theme } from "@better-auth/ui-core";
import type { PropType } from "vue";
import { defineComponent, h } from "vue";

export const Divider = defineComponent({
	name: "Divider",
	props: {
		text: { type: String, required: true },
		theme: { type: Object as PropType<Theme>, required: true },
	},
	setup(props) {
		return () =>
			h("div", { class: props.theme.divider }, [
				h("span", { class: props.theme.dividerText }, props.text),
			]);
	},
});
