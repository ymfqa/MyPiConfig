import {
    ExtensionAPI,
    isToolCallEventType,
} from "@earendil-works/pi-coding-agent";
import { getInfoString } from "./language";

export default function (pi: ExtensionAPI) {
    pi.on("tool_call", async (event, ctx) => {
        const info = getInfoString();
        if (
            isToolCallEventType("write", event) ||
            isToolCallEventType("edit", event)
        ) {
            const ok = await ctx.ui.confirm(
                info.allowFileEditTitle,
                info.allowFileEdit,
            );
            if (!ok) {
                return { block: true, reason: info.userCancel };
            }
        } else if (isToolCallEventType("bash", event)) {
            if (
                event.input.command.includes("rm") ||
                event.input.command.includes("sudo")
            ) {
                const ok = await ctx.ui.confirm(
                    info.allowBashTitle,
                    info.allowBash,
                );
                if (!ok) {
                    return { block: true, reason: info.userCancel };
                }
            }
        }
    });
}
