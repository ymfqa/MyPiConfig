import {
    ExtensionAPI,
    isToolCallEventType,
} from "@earendil-works/pi-coding-agent";

const PermissionList = ["受限", "自由"] as const;
export type PermissionMode = (typeof PermissionList)[number];
export let permission: PermissionMode = "受限";

export default function (pi: ExtensionAPI) {
    //会话开始自动加载
    pi.on("session_start", () => {
        pi.events.emit("permission", permission);
    });
    //命令切换模式
    pi.registerCommand("permission", {
        description: "更换权限模式",
        handler: async (_args, ctx) => {
            const choice: PermissionMode =
                ((await ctx.ui.select("choose permission mode", [
                    ...PermissionList,
                ])) as PermissionMode) || "受限";
            permission = choice;
            pi.events.emit("permission", permission);
        },
    });
    //实际权限检查部分
    pi.on("tool_call", async (event, ctx) => {
        if (permission === "受限") {
            //写文件拦截
            if (
                isToolCallEventType("write", event) ||
                isToolCallEventType("edit", event)
            ) {
                const choice = await ctx.ui.select(
                    "申请编辑/更改文件，是否允许",
                    ["允许", "拒绝", "拒绝并且说明理由"],
                );
                if (choice !== "允许") {
                    if (choice === "拒绝并且说明理由") {
                        const reason = await ctx.ui.input("请输入理由");
                        return { block: true, reason: reason };
                    }
                    return { block: true, reason: "用户取消" };
                }
            }
            //特殊命令拦截
            else if (isToolCallEventType("bash", event)) {
                if (
                    /\b(rm|sudo)\b|python3?\s*(-c|<<|-(\s|$))|\b(cat|echo|printf)\b[^|]*>>?/.test(
                        event.input.command,
                    )
                ) {
                    const choice = await ctx.ui.select(
                        "申请执行危险命令，是否允许",
                        ["允许", "拒绝", "拒绝并且说明理由"],
                    );
                    if (choice === "拒绝") {
                        return { block: true, reason: "用户取消" };
                    } else if (choice === "拒绝并且说明理由") {
                        const reason = await ctx.ui.input("请输入理由");
                        return { block: true, reason: reason };
                    }
                }
            }
        }
    });
}
