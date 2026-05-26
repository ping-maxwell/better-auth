<script lang="ts">
import type { Theme } from "@better-auth/ui-core";

interface Props {
	text: string;
	theme: Theme;
}

let { text, theme }: Props = $props();
</script>

<div class={theme.divider}>
	<span class={theme.dividerText}>{text}</span>
</div>
