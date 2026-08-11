import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LanguageList = ["中文", "English"] as const;
export type Language = (typeof LanguageList)[number];
interface InfoString {
    allowFileEditTitle: string;
    allowFileEdit: string;
    allowBashTitle: string;
    allowBash: string;
    userCancel: string;
    // branch: string;
    model: string;
    language: string;
    // noBranch: string;
    noSessionName: string;
    // cost: string;
    // sessionName: string;
    // context: string;
}
const infoStringMap: Record<Language, InfoString> = {
    ["中文"]: {
        allowFileEditTitle: "文件编辑/写入",
        allowFileEdit: "是否运行更改文件",
        allowBashTitle: "运行命令",
        allowBash: "是否运行命令",
        userCancel: "用户取消",
        // branch: "分支",
        model: "模型",
        // cost: "模型用量",
        language: "语言",
        // noBranch: "没有Git分支",
        noSessionName: "未命名会话",
        // sessionName: "会话名称",
        // context: "上下文",
    },
    ["English"]: {
        allowFileEditTitle: "File edit/write",
        allowFileEdit: "Allow file edit/write",
        allowBashTitle: "Run command",
        allowBash: "Allow run command",
        userCancel: "User cancelled",
        // branch: "Branch",
        model: "Model",
        // cost: "Model cost",
        language: "Language",
        // noBranch: "No git branch",
        noSessionName: "unamed session",
        // sessionName: "Session Name",
        // context: "context",
    },
};

// 持久化：扩展目录下的 .language 纯文本文件
const CONFIG_FILE = join(dirname(fileURLToPath(import.meta.url)), ".language");

export let lang: Language = "English";

// 直接读文件拿当前语言（不依赖模块变量——扩展间模块实例不共享）
export function readLanguage(): Language {
    try {
        const value = readFileSync(CONFIG_FILE, "utf8").trim() as Language;
        if (value in infoStringMap) return value;
    } catch {
        // 文件不存在或读取失败，保持默认
    }
    return "English";
}

function saveLanguage(): void {
    try {
        writeFileSync(CONFIG_FILE, lang, "utf8");
    } catch (e) {
        console.error("保存语言失败:", e);
    }
}

export default function (pi: ExtensionAPI) {
    lang = readLanguage();
    pi.registerCommand("language", {
        description: "change language",
        handler: async (_args, ctx) => {
            const choose =
                (await ctx.ui.select("choose your language", [
                    ...LanguageList,
                ])) || "English";
            if (choose === readLanguage()) return;
            lang = choose as Language;
            saveLanguage();
            // 刷新状态，重新渲染footer
            ctx.ui.setStatus("language", choose);
            ctx.ui.setStatus("language", undefined);
        },
    });
}

export const getInfoString = (): InfoString => {
    // 每次读文件：文件是唯一语言事实源，跨模块实例始终拿到最新语言
    return infoStringMap[readLanguage()];
};
