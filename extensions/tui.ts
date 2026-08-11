import {
    ExtensionAPI,
    ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { getInfoString, readLanguage } from "./language";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
    async function myFooter(_event: any, ctx: ExtensionContext) {
        ctx.ui.setFooter((_tui, theme, footerData) => ({
            render(width) {
                // 计算token使用情况
                let input = 0,
                    output = 0,
                    cost = 0;
                for (const e of ctx.sessionManager.getBranch()) {
                    if (
                        e.type === "message" &&
                        e.message.role === "assistant"
                    ) {
                        const m = e.message as AssistantMessage;
                        input += m.usage.input;
                        output += m.usage.output;
                        cost += m.usage.cost.total;
                    }
                }
                // 给footer内容放数组里面
                let lst: string[] = [];
                const fmt = (n: number) =>
                    n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
                const info = getInfoString();
                // 各个模块
                const work_dir = theme.fg("dim", ctx.cwd);
                const session_name =
                    ctx.sessionManager.getSessionName() != undefined
                        ? theme.fg(
                              "dim",
                              ctx.sessionManager.getSessionName() ||
                                  info.noSessionName,
                          )
                        : theme.fg("thinkingText", info.noSessionName);
                lst.push(
                    truncateToWidth(
                        work_dir +
                            " ".repeat(
                                Math.max(
                                    width -
                                        visibleWidth(work_dir) -
                                        visibleWidth(session_name),
                                    0,
                                ),
                            ) +
                            session_name,
                        width,
                    ),
                );
                const branch = theme.fg(
                    "muted",
                    " " + footerData.getGitBranch() || "",
                );
                if (footerData.getGitBranch()) {
                    lst.push(branch);
                }
                const model_id = theme.fg(
                    "dim",
                    `${info.model}:${ctx.model?.id}`,
                );
                const model_cost = theme.fg(
                    "dim",
                    `↑${fmt(input)} ↓${fmt(output)} $${cost.toFixed(3)}`,
                );
                const model_context = theme.fg(
                    "dim",
                    (() => {
                        const usage = ctx.getContextUsage();
                        if (!usage || usage.percent === null)
                            return `󰐟?/${fmt(ctx.model?.contextWindow ?? 0)}`;
                        return `󰐟${usage.percent.toFixed(1)}%/${fmt(usage.contextWindow)}`;
                    })(),
                );
                lst.push(
                    truncateToWidth(
                        model_id +
                            " ".repeat(
                                Math.max(
                                    width -
                                        visibleWidth(model_id) -
                                        visibleWidth(
                                            model_cost + " " + model_context,
                                        ),
                                    0,
                                ),
                            ) +
                            model_cost +
                            " " +
                            model_context,
                        width,
                    ),
                );
                const language = theme.fg(
                    "dim",
                    `${info.language}:${readLanguage()}`,
                );
                lst.push(language);
                return lst;
            },
            invalidate() {},
        }));
    }
    // 会话开始时候设置footer
    pi.on("session_start", myFooter);
    pi.registerCommand("reset_footer", {
        description: "reset your footer",
        handler: async (_args, ctx) => {
            ctx.ui.setFooter(undefined);
        },
    });
    pi.registerCommand("footer", {
        description: "change your footer",
        handler: myFooter,
    });
}
