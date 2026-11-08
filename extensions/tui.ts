import {
    ExtensionAPI,
    ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { getInfoString, readLanguage } from "./language";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { getPermission } from "./permission";

export default function (pi: ExtensionAPI) {
    async function myFooter(_event: any, ctx: ExtensionContext) {
        ctx.ui.setFooter((_, theme, footerData) => {
            return {
                render(width) {
                    function space_between(a: string, b: string) {
                        return truncateToWidth(
                            a +
                                " ".repeat(
                                    Math.max(
                                        width -
                                            visibleWidth(a) -
                                            visibleWidth(b),
                                        0,
                                    ),
                                ) +
                                b,
                            width,
                        );
                    }
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
                    lst.push(space_between(work_dir, session_name));
                    const gitBranch = footerData.getGitBranch();
                    const branch = theme.fg(
                        "muted",
                        gitBranch ? ` ${gitBranch}` : "",
                    );
                    if (gitBranch) {
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
                                return `󰐟 ?/${fmt(ctx.model?.contextWindow ?? 0)}`;
                            return `󰐟 ${usage.percent.toFixed(1)}%/${fmt(usage.contextWindow)}`;
                        })(),
                    );
                    const right_model_info = model_cost + " " + model_context;
                    lst.push(space_between(model_id, right_model_info));
                    const language = theme.fg(
                        "dim",
                        `${info.language}:${readLanguage()}`,
                    );
                    const permission = theme.fg(
                        "dim",
                        `${info.permissionMode}:${getPermission() == "Plan" ? info.planMode : info.freeMode}`,
                    );
                    lst.push(space_between(language, permission));
                    return lst;
                },
                invalidate() {},
            };
        });
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
