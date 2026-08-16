---
version: "alpha"
name: "Hush"
description: "A compact trust-and-control design system for the Hush Chrome extension."
colors:
  primary: "#4F5F9F"
  primary-hover: "#3F4E89"
  primary-action: "#465691"
  accent: "#78D5CA"
  accent-light: "#E9F8F6"
  accent-ring: "#9DE1D9"
  surface: "#FFFFFF"
  background: "#EEF1F8"
  popup-background: "#F6F7FB"
  table-head: "#F6F7FB"
  text: "#11183F"
  text-strong: "#1A1A2E"
  text-secondary: "#646981"
  text-muted: "#6B6F84"
  border: "#E7E9F1"
  border-light: "#EEF0F5"
  danger: "#C43D3D"
  danger-strong: "#991B1B"
  danger-light: "#FEF2F2"
  warning: "#92400E"
  warning-light: "#FFFBEB"
  success: "#10B981"
  info: "#0078D4"
  baidu: "#2932E1"
  so-orange: "#FF6600"
  on-primary: "#FFFFFF"
  on-danger: "#FFFFFF"
typography:
  headline-display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 42px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: 0px
  headline-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0px
  headline-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0px
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0px
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0px
  label-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0px
  label-caps:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.06em
  code-sm:
    fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  card: 16px
  dialog: 18px
  full: 999px
spacing:
  2xs: 4px
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
components:
  app-nav:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    height: 56px
  popup-root:
    backgroundColor: "{colors.popup-background}"
    textColor: "{colors.text}"
    width: 290px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  hero-panel:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.primary}"
    rounded: "{rounded.dialog}"
    padding: "{spacing.3xl}"
  button-primary:
    backgroundColor: "{colors.primary-action}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    height: 42px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    height: 42px
  segmented-control:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.2xs}"
  badge-domain:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.primary-action}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  badge-danger:
    backgroundColor: "{colors.danger-light}"
    textColor: "{colors.danger-strong}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"
  toggle:
    backgroundColor: "{colors.primary-action}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    width: 44px
    height: 26px
  result-floating-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    size: 40px
  result-inline-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    size: 24px
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    padding: "{spacing.2xl}"
  table-header:
    backgroundColor: "{colors.table-head}"
    textColor: "{colors.text-secondary}"
    padding: "{spacing.md}"
  divider-line:
    backgroundColor: "{colors.border-light}"
    height: 1px
  panel-border:
    backgroundColor: "{colors.border}"
    height: 1px
  stat-number:
    textColor: "{colors.text-strong}"
  empty-state:
    textColor: "{colors.text-muted}"
  focus-ring:
    backgroundColor: "{colors.accent-ring}"
  chart-bar:
    backgroundColor: "{colors.accent}"
  danger-action:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  warning-surface:
    backgroundColor: "{colors.warning-light}"
    textColor: "{colors.warning}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  success-dot:
    backgroundColor: "{colors.success}"
    size: 8px
  engine-bing-dot:
    backgroundColor: "{colors.info}"
    size: 8px
  engine-baidu-dot:
    backgroundColor: "{colors.baidu}"
    size: 8px
  engine-so-dot:
    backgroundColor: "{colors.so-orange}"
    size: 8px
---

## Overview

Hush 的界面气质是“可信、克制、可操作”的搜索结果管理工具。它不是夸张的网络安全视觉，也不是营销型落地页；它应该像一个安静的浏览器控制台，让用户快速理解当前状态、规则数量、拦截趋势，并能放心地添加或撤销屏蔽规则。

设计核心是雾蓝灰工作台、白色操作面板、克制的靛蓝品牌色与柔和青绿反馈。靛蓝代表安静、边界和可靠控制；青绿只用于逐渐消隐的品牌记忆点与轻量反馈；红色用于已屏蔽、危险、删除或广告标记。所有界面都应优先服务高频扫描、比较和管理，而不是展示性装饰。

## Colors

主色使用 `primary` 靛蓝，集中出现在顶部导航、Popup header、关键数字和品牌图标中。操作色使用 `primary-action`，用于添加、确认、开关启用、图表柱和页面内浮动操作。柔和青绿 `accent` 对应 H 标志逐渐安静下来的末端，只用于图表辅助序列、轻量反馈和小面积强调。`accent-light` 用于标签背景和选中状态，避免大面积高饱和色块。

中性色承担主要界面结构：`background` 是 options 页的工作台底色，`popup-background` 是 popup 的紧凑底色，`surface` 是表格、面板和弹窗的承载面。文本优先使用 `text`，辅助说明使用 `text-secondary`，空状态、图标和时间信息使用 `text-muted`。

`danger` 与 `danger-strong` 用于删除、屏蔽、广告和错误提示；不要把红色用于普通强调。`warning` 保留给需要用户注意但不是错误的状态。搜索引擎品牌色只出现在搜索历史的引擎标识或菜单点位中，不能替代 Hush 的主色系统。

## Typography

默认字体为系统 UI 字体栈，确保 Chrome 扩展在 macOS、Windows 和 Linux 上都保持原生、清晰、低延迟的观感。数字统计可使用 `headline-display` 或 `headline-lg`，但只在 dashboard hero、popup 统计卡这类真正需要一眼识别的区域使用。

组件标题使用 `headline-md`，正文和说明使用 `body-md` / `body-sm`。表头、筛选项、按钮和徽标使用 `label-md` 或 `label-caps`。域名、URL、选择器和代码片段使用 `code-sm`，并允许换行或 `word-break: break-all`，确保长 URL 不撑破布局。

字体大小不随视口宽度缩放。除全大写表头类标签可以使用 `label-caps` 的 0.06em 字距外，其他文本字距保持 0。

## Layout

Options 页是主工作台：顶部导航高度固定为 56px，内容区最大宽度 1280px，页面内边距 24px。Dashboard 可以使用两列布局承载“拦截构成”和“近 7 天趋势”，在窄屏下合并为单列。规则、历史和设置页以单个主要面板为核心，不要把页面切成过多装饰性模块。

Popup 是 290px 宽的紧凑控制面板，信息顺序应保持为品牌与启用开关、关键统计、当前站点状态、趋势、设置入口。Popup 内的数字卡、状态条和图表必须有稳定高度，避免 storage 更新时跳动。

Content script 注入的元素使用 `hush-` 前缀，尽量采用绝对定位或 fixed 定位，不改变搜索结果页面原有文档流。浮动按钮、结果内屏蔽按钮、badge、toast 和 picker overlay 都必须让用户明确知道这是扩展层，而不是搜索引擎页面原生内容。

## Elevation & Depth

深度层级要轻。普通面板使用 1px 蓝灰边框和很轻的阴影；下拉菜单、浮层和注入 popup 使用中等阴影；确认弹窗和 toast 才使用最大阴影。阴影颜色应带一点 `text` 的深蓝倾向，避免纯黑重阴影让工具界面显得笨重。

不要用离散光斑、漂浮渐变球或厚重玻璃效果作为背景。允许在 dashboard hero 或图表柱上使用低对比渐变，但它必须服务状态表达，不能成为装饰主体。

## Shapes

小型页面注入控件使用圆形或 `rounded.full`，例如 24px 结果内按钮、40px 浮动按钮、开关滑块。工具按钮和输入框使用 8px 到 10px 圆角。主面板使用 16px，弹窗使用 18px。

徽标可以使用胶囊形或 4px 小圆角：类型标签偏胶囊，屏蔽/广告 badge 偏小圆角，形成“标注/盖章”的感觉。不要在普通页面 section 外再包一层大卡片，避免卡片套卡片。

## Components

导航栏使用白色承载面和蓝灰分隔线，当前 tab 用低透明度靛蓝底表达选中。品牌标识统一使用带青绿消隐点的 Hush H，保持 22px 左右的稳定尺寸。

按钮分为三类：主按钮用于添加、确认和启用；幽灵按钮用于删除、打开、切换等低风险操作；图标按钮用于关闭、设置、下拉和结果页快捷操作。主按钮悬停时变深，焦点态使用 `accent-ring` 的 2px 或 3px 外环。

表格是规则和历史的主表达方式。表头使用浅背景、12px 粗体大写标签，行高保持紧凑，hover 只使用极浅背景。URL 和选择器必须使用等宽字体并支持断行。

Toggle 代表二元设置，默认宽 44px、高 26px；Popup 内可用 38px、高 22px 的紧凑版本。开启态为靛蓝，关闭态为中性灰。开关不要用文字按钮替代。

图表保持轻量：趋势和主要序列使用 `primary-action`，辅助序列使用 `accent` 或紫色；零值和网格使用 `border-light`。分布条用红色表示广告、青绿色表示域名规则、蓝灰色表示其他。

弹窗由半透明深蓝遮罩和白色 dialog 组成，宽度约 460px，内边距 24px。关闭按钮是 32px 图标按钮。错误反馈使用红色文字，提示反馈使用辅助文本色。

搜索结果页注入态有三种主要元素：白底圆形屏蔽按钮、红色已屏蔽 badge、斜向浅红遮罩。已屏蔽态应该像文档被标注或盖章，而不是把结果完全抹掉；撤销入口应靠近 badge，保证可恢复感。

## Do's and Don'ts

Do:

- 保持界面安静、密集、可扫描，让用户能快速管理规则和历史。
- 使用靛蓝表达启用和确认，使用红色表达屏蔽、删除和错误。
- 为所有固定格式控件设置稳定尺寸，包括 nav、toggle、图表柱、表格列、icon button 和 popup 宽度。
- 在长域名、URL、选择器上使用等宽字体和断行策略。
- 让 content script 注入元素独立、可识别、可撤销，并始终使用 `hush-` 前缀。

Don't:

- 不要把 Options 页做成营销式 hero 或宣传页；第一屏应该直接是可用工具。
- 不要使用紫色/蓝紫渐变、奶油色大面积背景、玻璃拟态或装饰性光斑。
- 不要把红色用于普通强调，也不要让危险操作看起来像主操作。
- 不要嵌套卡片，页面 section 应保持清楚的面板或表格结构。
- 不要让按钮文字、URL、badge 或动态数字撑破容器或导致布局跳动。
