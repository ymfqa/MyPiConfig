import {
    ExtensionAPI,
    isToolCallEventType,
} from "@earendil-works/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getInfoString } from "./language";

const PermissionList = ["Plan", "Free"] as const;
export type PermissionMode = (typeof PermissionList)[number];
const DEFAULT_PERMISSION: PermissionMode = "Plan";

// 持久化：扩展目录下的 .permission 纯文本文件
const CONFIG_FILE = join(
    dirname(fileURLToPath(import.meta.url)),
    ".permission",
);

export let Permission: PermissionMode = DEFAULT_PERMISSION;

// 直接读文件拿当前权限模式（不依赖模块变量——扩展间模块实例不共享）
export function readPermission(): PermissionMode {
    try {
        const value = readFileSync(CONFIG_FILE, "utf8").trim() as PermissionMode;
        if ((PermissionList as readonly string[]).includes(value)) return value;
    } catch {
        // 文件不存在或读取失败，保持默认
    }
    return DEFAULT_PERMISSION;
}

export function getPermission(): PermissionMode {
    return readPermission();
}

function savePermission(): void {
    try {
        writeFileSync(CONFIG_FILE, Permission, "utf8");
    } catch (e) {
        console.error("保存权限模式失败:", e);
    }
}

export default function (pi: ExtensionAPI) {
    Permission = readPermission();
    pi.registerCommand("permission", {
        description: "change permission mode",
        handler: async (_args, ctx) => {
            const choose =
                (await ctx.ui.select("choose permission mode", [
                    ...PermissionList,
                ])) || DEFAULT_PERMISSION;
            if (choose === readPermission()) return;
            Permission = choose === "Free" ? "Free" : "Plan";
            savePermission();
            // 刷新状态，重新渲染footer
            ctx.ui.setStatus("permission", Permission);
            ctx.ui.setStatus("permission", undefined);
        },
    });
    pi.on("tool_call", async (event, ctx) => {
        const info = getInfoString();
        if (readPermission() === "Plan") {
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
                    /\b(rm|sudo)\b|python3?\s*(-c|<<|-(\s|$))|\b(cat|echo|printf)\b[^|]*>>?/.test(
                        event.input.command,
                    )
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
        }
    });
}
