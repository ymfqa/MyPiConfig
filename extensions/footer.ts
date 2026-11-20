import {
    ExtensionAPI,
    ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { permission, type PermissionMode } from "./permission";

//左右对齐
function space_between(width: number, a: string, b: string) {
    return truncateToWidth(
        a +
            " ".repeat(Math.max(width - visibleWidth(a) - visibleWidth(b), 0)) +
            b,
        width,
    );
}
export default function (pi: ExtensionAPI) {
    async function myFooter(ctx: ExtensionContext) {
        ctx.ui.setFooter((tui, theme, footerData) => {
            //权限监听
            let mode: PermissionMode = permission;
            const unseb_permission = pi.events.on("permission", (data) => {
                mode = data as PermissionMode;
                tui.requestRender();
            });
            return {
                invalidate(): void {},
                dispose: () => {
                    unseb_permission();
                },
                render(width: number): string[] {
                    //最终返回的footer列表
                    let footer: string[] = [];
                    //后面可以少写个参数
                    const format = (a: string, b: string) => {
                        return space_between(width, a, b);
                    };
                    //第一行：工作目录+会话名称
                    const work_dir = theme.fg("dim", ctx.cwd);
                    const name = ctx.sessionManager.getSessionName();
                    const session_name = theme.fg(
                        name ? "dim" : "thinkingText",
                        name || "未命名会话",
                    );
                    footer.push(format(work_dir, session_name));
                    //第二行：git状态
                    const gitBranch = footerData.getGitBranch();
                    if (gitBranch) {
                        footer.push(
                            theme.fg(
                                "muted",
                                gitBranch ? ` ${gitBranch}` : "",
                            ),
                        );
                    }
                    //第三行：模型名称+模型上下文
                    const model_name =
                        theme.fg("dim", `${ctx.model?.name}`) +
                        theme.fg("accent", ` [${ctx.model?.provider}]`);
                    const fmt = (n: number) => {
                        return n >= 1_000_000
                            ? `${(n / 1_000_000).toFixed(1)}M`
                            : n >= 1000
                              ? `${(n / 1000).toFixed(1)}k`
                              : `${n}`;
                    };
                    //上下文缓存
                    let usage_text: string | undefined;
                    const usage = ctx.getContextUsage();
                    if (!usage || usage.percent === null) {
                        usage_text = `󰐟 ?/${fmt(usage?.contextWindow ?? 0)}`;
                    } else {
                        usage_text = `󰐟 ${usage.percent.toFixed(1)}%/${fmt(usage.contextWindow)}`;
                    }
                    const model_context = theme.fg("dim", usage_text);
                    footer.push(format(model_name, model_context));
                    //第四行：当前权限模式
                    const permisson_str = theme.fg("dim", mode);
                    footer.push(permisson_str);
                    return footer;
                },
            };
        });
    }
    //会话开始时候设置footer
    pi.on("session_start", (_event, ctx) => {
        myFooter(ctx);
    });
    //命令切换footer
    let enable_footer: boolean = false;
    pi.registerCommand("footer", {
        description: "change your footer",
        handler: async (_args, ctx) => {
            enable_footer = !enable_footer;
            if (enable_footer) {
                await myFooter(ctx);
            } else {
                ctx.ui.setFooter(undefined);
            }
        },
    });
}
