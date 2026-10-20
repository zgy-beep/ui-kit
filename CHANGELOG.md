# 变更记录

本项目遵循语义化版本：

- 修 bug / 调整单个 token 值：补丁版本（2.1.x）
- 新增组件 / 新增 token（不破坏既有 DOM 与取值）：小版本（2.x.0）
- 重命名类 / token、删除 token、修改 DOM 契约：大版本（x.0.0）

## v2.4.0（2026-10-20）· 浮层载体完善（宿主模态让位机制 + 3 个新 API）

本轮把「浮层载体」从一个**层级档位**升级为一个**完整的宿主共存机制**。
v2.3.0 解决的是「kit 浮层被宿主**常规内容**压住」；本版解决的是性质不同的另一类问题：
**宿主自己打开模态弹窗时，kit 浮层该怎么办。**

**关键结论（真实 ST 宿主实测，证伪了 v2.3.0 的一处乐观假设）**

- 宿主 `dialog.showModal()` 打开的模态会进入浏览器 top layer，**任何 z-index 都压不过**；
- **`popover="manual"` 也压不过**（v2.3.0 README §13.5.1 对照表 F 行原写「能压过一切」，本次实测证伪并更正）——
  无论 popover 与 modal 谁先 show，模态恒胜；
- **根因不是 z-index，而是 `inert`**：`showModal()` 会给**整个文档**加 `inert`，
  而 `inert` 元素**不参与命中测试**（`elementsFromPoint` 不返回它们），也无法获得焦点；
- 因此 kit 浮层在宿主模态期间**物理上不可能**既压过模态又保持可交互；
- 宿主模态关闭后，kit 浮层**立即还原**（层级与交互均恢复）。

**设计决策：不硬压，改为主动让位**

既然硬压不可能，正确的产品行为不是「继续盖着导致用户点了没反应」，而是**明确让位 + 视觉反馈**：

- `components.css` 新增宿主模态降级态 `dialog.nvui-tl.is-host-modal`：
  `pointer-events: none`（不可点）+ `opacity: 0.35`（压暗）+ `filter: grayscale(0.6)`（去色），
  并对子浮层（`.nvui-overlay` / `.nvui-floating` / `.nvui-toast-stack`）一并禁用命中；
  恢复态用 `dialog.nvui-tl:not(.is-host-modal)` 声明 transition，避免淡入拖尾。
  **纯新增状态类，不改动任何既有选择器与 DOM 结构。**
- `nvui-api.js` 新增三个 API（均为**增量导出**，不改既有函数签名）：
  - `countHostModals()` —— 统计宿主模态数，用 `dialog:modal` 伪类（Chrome/Edge 105+、Safari 17.4+），
    并**自动排除 kit 自身载体**（避免自我降级）；不支持 `:modal` 的浏览器退化为「存在 `open` 的非 kit dialog」；
  - `syncHostModalState()` —— 同步 `.is-host-modal` 类到所有 kit 载体，返回当前宿主模态数；
  - `getCarrierState()` —— 返回层级快照 `{ carrierZ, hostModalCount, degraded, carriers[] }`，供诊断与宿主集成。
- 触发时机：`createPanel()` / `showToast()` / `openLayer()` 各调用一次；
  另装**幂等** watcher（`MutationObserver` 监听 `<dialog>` 的 `open` 属性变化 + 捕获阶段 `close` 事件），
  因此**宿主模态在面板已打开之后才弹出**时也会自动降级，关闭后自动还原，**宿主无需任何配合**。

**令牌与兼容性**

- **未新增 / 未删除 / 未重命名任何 token**：110 深色 / 47 浅色 / 78 类 / 16 关键帧契约保持不变，
  复用既有 `--nvui-z-layer`；
- 无破坏性 DOM 变更 → **小版本**；
- 宿主不使用原生 `<dialog>` 模态（如自绘全屏遮罩）时，本机制不会触发，行为与 v2.3.0 完全一致。

**文档**

- README 新增 **§13.7「载体与宿主模态」**（实测真相表 / 设计决策 / CSS 配方 / API 表 / 宿主集成建议）、
  **§10.9「v2.3.0 → v2.4.0 修订说明」**；
- README **§13.6 标题层级修正**（`## 13.6` → `### 13.6`，此前误用二级标题导致其脱离第 13 章目录层级）；
- README §6.6 层级表补「宿主模态例外」说明；§8 宿主兼容红线**新增第 10 条**「宿主模态期间 kit 浮层必须主动让位」；
- README §13.5.1 方案对照表 F 行更正（`popover=manual` 压不过模态）；
- README §13.1 API 速查表补三行新 API；§11 版本管理更新；
- `AI-GUIDE.md` 升至 v2.4.0：硬约束第 3 条补「宿主模态让位」子项、API 速查补三行、第 6 章版本信息更新。

**测试**

- 规范测试新增 8 条断言（降级态 CSS 存在 / 三个 API 导出 / 三处调用点 / `:modal` 且排除自身载体 /
  版本全量对齐 2.4.0 / 模板与主目录资产一致 / 新实机脚本存在 / README §13.7 章节存在），**271 → 279 条全绿**；
- 新增实机脚本 `test/st-carrier-host-modal-check.js`（18 项断言全绿，控制台零错误）：
  正常态无降级 → 宿主 `showModal()` 后自动加 `.is-host-modal`（`pointer-events:none` + `opacity:0.35`）→
  `getCarrierState()` 快照正确（`hostModalCount` / `degraded` / 各载体 `degraded`）→
  模态关闭后自动移除并恢复可命中 → `countHostModals()` 不自我降级。

## v2.3.0（2026-10-20）· 浮层载体层级修复 + 运行时正确性修复 + ST 扩展模板

本轮针对 `nvui-api.js` 做了一轮代码审查，并在**真实 SillyTavern 宿主（v1.19.0）**中实机复现与回归验证。
本条目与下述「浮层载体层级修复」合并为 **v2.3.0**：新增 1 个层级 token（`--nvui-z-layer`），无类名 / DOM 契约破坏性变更。

**bug 背景（novel-stream 实机冒烟测试定位，2026-10-20）**

- 沙盒测试无宿主层级竞争，集体失明；真实酒馆里 `#sheld`（聊天容器，`position:absolute; z-index:30`）在聊天非空时
  整块盖住 kit 面板（鼠标点击被 `.mes` 拦截）；
- 中性页对照实验（Edge 152）证实：`show()` 的 dialog 输给 `z-index:30` 的 div，`showModal()` 才赢——
  top layer 只服务于模态对话框，而模态的 `inert` 会废掉宿主交互，故 kit 禁用；
- 此前 README / CSS 注释中「由 dialog 提升渲染层级」「实际层级由浏览器 top layer 决定」为错误论断，本次一并修正。

**层级 P0 修复（浮层被酒馆内容压在后面）**

- **现象**：真实 ST 宿主中打开面板，NVUI 面板整体被酒馆聊天区压在后面，可见但点不到（用户截图报障）。
- **实机证据**：`elementsFromPoint()` 命中栈 —— 面板中心点顶层是宿主 `fa-solid fa-address-card`（ST 消息区按钮），
  kit 元素排在第 5 位；宿主 `#sheld`（聊天列）是 `z-index: 30` 的 absolute 元素。
- **根因**：① 实测确认**非模态 `dialog.show()` 并不会进入浏览器 top layer**（只有 `showModal()` 会，
  而它会给整个文档加 `inert`，导致宿主完全不可交互，此路已排除）；
  ② `position: fixed` **总是**创建层叠上下文，载体内部子元素的 z-index 只在载体内部生效；
  而修复前载体是 `z-index: auto`（整体仅相当于 z-index 0），因此被宿主高 z-index 区域压住。
- **修复**：新增令牌 `--nvui-z-layer: 1000000`（载体档；宿主竞争上限约 29999，floating 1000010 / overlay 1000020 / tooltip 1000030 不变）；
  `components.css` 载体显式声明 `z-index: var(--nvui-z-layer)`（新增的专属载体档，1000000）；
  新增 `dialog.nvui-tl.nvui-tl-toast { z-index: var(--nvui-z-tooltip); }`；
  `nvui-api.js` 的吐司载体加 `.nvui-tl-toast` 类（使吐司层级高于面板载体）。
  **新增 1 个 token**（`--nvui-z-layer`），子浮层档位（floating / overlay / tooltip）不变，零破坏性变更。
- **方案对照实验**（`test/st-layer-probe.js`，真实宿主内 5 组）：
  `dialog` + `z-index:auto` 3 采样点仅胜 1；`dialog` + 极大 z-index 胜 3；
  `popover="manual"` 胜 3（真 top layer，但宿主兼容面更窄）。最终采用 token 化的 z-index 方案。
- **回归**：规范测试新增层级断言防回归，最终 261 条全绿（详见下文「测试」）；
  实机 `test/st-layer-check.js` 修复后 5 个采样点全部 `oursOnTop: true`，关闭后层级还原，控制台零错误。

**文档论断修正（重要）**

- 原文档多处表述「由 `dialog.show()` 提升渲染层级 / 进入 top layer」是**错误的**。
  已逐处改为准确说明，覆盖 `README.md` §2.3 / §6.6 / §7.14 / §8 / §10 / §13 与 `AI-GUIDE.md`；
  `components.css` 中保留「实测结论，勿改」的推导注释，避免后人再误改。
- `README.md` 新增 §13.5.1「层级 P0 修复」，含根因、对照实验表、修复代码与移植提醒。

**新增目录**

- `ISSUES.md`：本地 issue 追踪表，与 GitHub Issues 双向对应。
  当前登记 **11 条已修复**、**5 条待办**（#8 / #9 / #10 / #12 / #16）、**2 条已确认不修**（附不修理由）、
  以及 7 个实机测试脚本索引。规则：疑似问题先登记、写明复现证据、不允许凭印象下结论。

**已修复的正确性问题**

- `animationend` 冒泡截断退场动画（P0，实机复现）：面板内部的子动画（如 `.nvui-tabpane-in`）结束时会冒泡到 overlay，
  旧实现未校验 `event.target`，导致 overlay 自身的退场动画被提前截断、面板瞬间消失。
  修复：`onAnimEnd` 增加 `event.target !== overlayEl` 校验；吐司 `dismiss()` 同样处理并校验 `animationName`。
- `el()` 的 `html` → `innerHTML` 通道（XSS 缺口）：移除该分支，只保留 `text` → `textContent`，
  其余属性一律 `setAttribute`。
- document 级 `keydown` 监听器泄漏：每次 `createPanel` 都在 document 上挂一个监听器且从不注销。
  修复：新增**全局单例 Esc 调度器**（`escapeStack`），只有最上层可见浮层响应 Esc，面板销毁时自动注销。
- 重复 id / dialog 永不销毁：同名面板会产生重复 `id`（含 `-layer` / `-overlay` / `-title` 派生 id）。
  修复：新增 `uniqueId()` + `idTaken()`，冲突时自动加后缀；新增 `destroy()` 移除 DOM 并注销监听。
- `aria-modal="true"` 名不副实：没有焦点陷阱，Tab 会跑到面板外。
  修复：面板内实现 focus trap（Tab / Shift+Tab 循环）。
- 焦点归还失败（ST 宿主真实行为）：ST 的 wand 菜单点击菜单项后自动收起，触发按钮随之不可聚焦，
  `opener.focus()` 静默失败、焦点掉到 `body`。修复：新增 `isFocusable()` 校验 + `focusFallback` 三级兜底
  （触发元素 → `focusFallback` → 面板本身）。

**本轮新增修复（ISSUES.md 待办区）**

- **#13 `prefers-reduced-motion` 门禁作用域不足（P2 无障碍）**：原降级块只覆盖 `.nvui-scope *` 与
  `dialog.nvui-tl *` —— 宿主把 kit 组件挂进自己的容器却**没加** `.nvui-scope` 时，组件动画照常播放，
  无障碍红线被绕过。修复：降级块改为**两层** —— 层 1 保留原有通配（覆盖作用域内的自定义子项），
  层 2 用 `:is(...)` **逐个点名 27 个自身带 animation/transition 的 kit 类**（含 `::before`/`::after`
  变体、`.nvui-stagger > *`、开关 checkbox）。点名而非通配，是为了**不波及宿主元素**。
  **未新增 `!important`**（仍 5 个，预算 ≤ 8 不变）。回归断言：扫描 `components.css` 中所有带
  `animation:`/`transition:` 的规则，提取 kit 基类并逐一断言出现在降级块选择器中。
- **#14 `preview.html` 性能（P3）**：`replayMotion` 原本逐节点读 `offsetWidth`（N 节点 = N 次同步强制回流），
  改为「批量摘类 → 全局只读一次 `document.body.offsetWidth` → 批量挂回」，并对 stagger 子项单独触发回流；
  滚动监听（`capture: true`）改用 `requestAnimationFrame` 合并为每帧至多一次重定位。
- **#11 进度条扫光常驻（P2）**：扫光是「进行中」的语义装饰，0% / 100% 时继续跑无限循环纯属浪费合成层资源。
  新增**可选**状态类 `.nvui-progress.is-idle`（0%）/ `.is-complete`（100%），CSS 侧 `animation: none`；
  `NVUI.progress().setValue()` 自动维护（`syncActivity`）。**不确定进度（`is-indeterminate`）永远保持扫光**。
  未新增 token、未改既有 DOM 契约（手写 DOM 不加类时行为与旧版一致）。
- **#15 宿主 `no-blur` 下玻璃重影（P2 视觉）**：宿主实际规则是
  `body.no-blur * { backdrop-filter: unset !important }` —— 浏览器**仍支持** `backdrop-filter`，
  所以 `@supports not` 降级块根本不触发，玻璃只剩半透明底色、下层文字直接透出形成重影。
  修复：`nvui-api.js` 新增 `detectGlassSupport()` / `syncGlassFallback()` ——
  **造一个隐藏 `.nvui-glass` 探针读渲染后的实际计算值**（`getComputedStyle().backdropFilter`），
  为 `none` 即判定被外部禁用，自动给根节点挂 `.nvui-solid` 实心回退。
  **不猜宿主类名**（避免与宿主实现耦合）。`createPanel()` / `showToast()` 已内置该调用。
  实机 `test/st-glass-fallback-check.js` **9/9 全绿**（宿主 no-blur 下探测值 `none`、
  面板背景 `rgb(22,26,36)` 不透明、移除 no-blur 后恢复 `blur(20px) saturate(1.5)`、零控制台错误）。

**新增能力**

- `NVUI.detectGlassSupport(options?)` / `NVUI.syncGlassFallback(options?)`：玻璃能力探测与实心回退。
- `NVUI.progress()` 的 `setValue()` 现在自动维护 `.is-idle` / `.is-complete` 状态类。
- `createPanel(options)` 新增 `focusFallback`（CSS 选择器或元素）与 `destroy`（清理回调）两个选项；
  控制器新增 `destroy()` 方法。
- 退场动画兜底定时器改为可清理（`clearTimeout`），避免动画未触发时定时器泄漏。

**新增目录**

- `st-extension-template/`：可直接复制使用的 SillyTavern 扩展模板骨架
  （`manifest.json` / `index.js` / `style.css` + `ui-kit/` 内嵌运行时），
  已在本机真实 ST 宿主完成扩展加载 / 面板打开 / tab 切换 / 吐司 / Esc 焦点归还 / 设置回写 / 移动端布局 7 项实机验证。
  模板中已沉淀 ST 宿主陷阱：`extension_settings` 是模块级导出（非 window 全局）、需实时读取；
  `getContext()` 快照不可缓存；扩展菜单是 Popper 浮层且点击后自动收起（故需 `focusFallback`）；
  扩展菜单 DOM 动态创建；`hooks.activate` 指向入口导出的函数名。

**性能疑点实机复核（ISSUES.md 待办区 5 项全部结清）**

上一轮登记的 5 项性能/层级疑点（#8 / #9 / #10 / #12 / #16）本轮在**真实 SillyTavern 宿主**
中逐项实测，**结论是 5 项全部「已确认-不修」**——它们要么被证伪，要么本就不是缺陷。
**本轮未改动任何运行时行为**（`components.css` / `nvui-api.js` / `tokens.css` 的实现零变更），
只新增测量脚本与文档结论。

测量方法：Chrome DevTools Protocol 的 `Performance.getMetrics`（布局次数 / 布局耗时 / 样式重算）
+ `requestAnimationFrame` 帧间隔分布，全部在真实酒馆页面（v1.19.0）中跑。

| # | 原疑点 | 实测数据 | 结论 |
| :--- | :--- | :--- | :--- |
| 8 | 进度条 `transition: width` 逐帧重排 | width 过渡 与 transform 缩放 布局次数**完全相同**（2.0 次/动画），耗时 14.3ms vs 16.2ms —— width 反而略快 | 不修 |
| 9 | tabs 指示器 `transition: width/height` 逐帧重排 | 累计布局耗时确实高（10.5 次/切换、21.89ms），但**帧间隔与无动画基线完全一致**（p95 16.80ms；超 16.7ms 帧 35/74 vs 基线 35/73） | 不修 |
| 10 | 折叠面板 `transition: grid-template-rows` 逐帧重排 | 5 次展开共 16.37ms（**3.27ms/次**），布局次数仅 10 次 | 不修 |
| 12 | 桌面端双层 `backdrop-filter` 开销显著 | 双层 p95 **16.80ms** = 单层 16.80ms = 无浮层基线 16.80ms | 不修 |
| 16 | 宿主 `showModal()` 模态压住 kit 浮层 | 层级事实成立，但宿主模态已用 `inert` 禁用整页交互（kit 浮层内按钮 `focus()` 失败），关闭后立即还原 | 不修（模态语义正确表现） |

**关键方法论（已写进 README §13.6 与 ISSUES.md 规则 2c）**：**累计布局耗时 ≠ 卡顿**。
tabs 指示器的 21.89ms 是跨整个过渡期（约 18 帧）累计，摊到每帧仅约 1.2ms，
远在 16.7ms 的 60fps 帧预算内 —— 判定性能问题必须看帧间隔。

**方案选型也做了实测**：对 tabs 指示器试过 `contain: layout` / `contain: strict` /
`will-change: transform` 三种「零契约变更」的隔离手段，**收益均为 -0.0 次/切换（完全无效）**；
唯一有效的 transform 缩放（0 次布局）需要改写 README §7.7 的 JS 变量契约
（`--nvui-tab-ind-w/h` → scale），属于**为不存在的卡顿付出破坏性代价**，故不采纳。

**新增实机脚本**（5 个）：

- `test/st-perf-probe.js`：性能总探针（#8 / #9 / #10 / #12）；
- `test/st-perf-tabs-fine.js`：分离「创建 DOM」与「纯动画」成本，三组对照；
- `test/st-perf-tabs-options.js`：四种修复方案选型；
- `test/st-perf-tabs-frames.js`：帧间隔判定（过渡期间 vs 无动画基线）；
- `test/st-modal-layer-check.js`：宿主模态与 kit 浮层的层级 / 焦点 / 还原三态。

**文档**

- README 新增 §13.6「性能实测结论」（方法论 + 5 项实测表 + 方案选型 + 适用边界）；
- README §7.7 加「性能实测结论」旁注；§13.5.1 补 `--nvui-z-layer` 载体档表述；
- README / AI-GUIDE 中载体 z-index 的 `--nvui-z-overlay` → `--nvui-z-layer` 漂移全部修正（v2.3.0 合并遗留）；
- ISSUES.md 待办区清零，5 项转入「已确认-不修」区并附实测数据与复现脚本；规则补 2b / 2c 两条。

**测试**

- `test/test-ui-kit.js` 新增第 9 节「运行时契约（nvui-api.js 行为红线）」14 条断言
  与第 10 节「ST 扩展模板自洽」13 条断言；总数 236 → **271**，全绿（本轮新增层级 / 动效降级 / 玻璃探测 / preview 性能 / 载体档位防漂移 / ISSUES 结清等断言）。
- 新增实机脚本：`test/st-live-check.js`（真实 ST 宿主运行时回归 6 项）、`test/st-template-check.js`（模板实机验证 7 项）、
  `test/st-glass-fallback-check.js`（玻璃实心回退，9 项）、`test/st-layer-check.js`（层级回归，5 采样点 `oursOnTop` 判定）、
  `test/st-layer-probe.js`（层级根因探针，5 方案对照）、`test/st-focus-probe.js`（焦点归还根因探针）、
  `test/st-glass-probe.js`（玻璃生效探测）、`test/st-toplayer-probe.js`（top-layer 行为探针）。
- 实机脚本统一使用 `playwright-core` 直连本机 Chrome；运行时须清掉代理环境变量
  （`env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY`），否则 Chromium 导航被代理劫持报 `ERR_CONNECTION_REFUSED`。

## v2.2.0（2026-10-17）

描边精致化（修复 1px 圆角描边锯齿）+ 新增设计调用 API / 机器可读令牌 / AI 协作指南（小版本；无破坏性变更）。

**描边精致化**

- 移除 6 处圆角玻璃外框 1px 描边（`.nvui-modal` / `.nvui-panel` / `.nvui-floating` / `.nvui-tooltip` / `.nvui-toast` / `.nvui-glass`），
  改用「柔和顶部受光 + 阴影」成形（阴影 token 内含 `inset 0 1px 0 var(--nvui-glass-highlight)`），消除圆角处亚像素锯齿；
- `--nvui-glass-line` 改为「玻璃表面内直线分隔」：深 `rgba(255, 255, 255, 0.06)` / 浅 `rgba(255, 255, 255, 0.28)`，
  用于 modal / panel 的 header / footer 与导航底边等 7 处直线分隔（直线不产生圆角锯齿）；
- `--nvui-glass-highlight` 深 `rgba(255, 255, 255, 0.05)` / 浅 `rgba(255, 255, 255, 0.40)`（柔和顶部受光，替代外框边）；
- `.nvui-btn.is-ghost`：去 1px 描边，改 `--nvui-block-bg` 淡底（hover `--nvui-block-bg-2`）；
- `.nvui-tabs-indicator`：去 1px 内环，改底部直线强调 `box-shadow: inset 0 -2px 0 var(--nvui-accent-line)`；
- `.nvui-empty`：去虚线圆角边，改 `--nvui-bg-3` 淡底 + 居中提示；
- `--nvui-focus-ring-w` 1.5px → **2px**（单圈、整数像素，缩放更清晰，不叠内圈描边）。

**能力降级补齐（审计阶段 6 发现）**

- `.nvui-panel` 纳入 `@supports not` / `prefers-reduced-transparency: reduce` / `forced-colors: active` /
  `.nvui-solid` 四个降级块：无 `backdrop-filter`、减少透明度、高对比与实心模式下与 `.nvui-modal` 一样回退
  不透明表面（`--nvui-bg`）与系统色 `CanvasText` 边界，不再在面板上残留半透明+模糊；
- 测试新增 4 条面板降级断言（共 221 条），README §2.4 玻璃浮层清单补 `.nvui-panel`。

**新增可选文件（不计入 token / 组件类数量）**

- `nvui-api.js`：零依赖运行时 API（`createPanel` / `showToast` / `switchRow` / `inputRow` / `accordion` / `progress` /
  `openLayer` / `closeLayer` / `getToken` / `setTheme` 等），生成符合面板布局标准与无障碍契约的 DOM；Node 加载不访问 DOM；
- `tokens.json`：`tokens.css` 的机器可读镜像（`dark` 109 个 / `light` 47 个覆盖，逐值一致）；
- `AI-GUIDE.md`：给 AI 的协作指南（硬约束 / 读文件顺序 / SillyTavern 面板标准流程 / 其它软件移植 / 提示词模板 / API 速查 / 验收清单）；
- `package.json` 新增 `"main": "nvui-api.js"`（Node 侧可直接 `require('sillytavern-nvui-kit')` 做测试/静态生成）。

**文档**

- README 升 v2.2.0：文件表新增 `nvui-api.js` / `tokens.json` / `AI-GUIDE.md`，快速开始补可选 JS API 用法；
  新增第 13 章「JS API 与 AI 协作指南」（API 函数表 + createPanel 示例 + tokens.json 结构 + AI-GUIDE 用法 + 移植要点），
  原「许可」顺延为第 14 章；§3 / §4 / §7 / §12 更新描边新规（圆角玻璃无外框、直线分隔、ghost/空态/指示器去描边、焦点环 2px）；
  新增 `### 10.7 v2.1.1 → v2.2.0`；§11 增加 v2.2.0 记录；CHANGELOG / package.json 升 2.2.0。

## v2.1.1（2026-10-17）

反馈驱动补丁：描边再减弱、单圈焦点环、面板固定尺寸、隐藏滚动条（**无新增/删除类与 token，无破坏性变更**；覆盖 CSS 即可升级）。

**描边再减弱（只保留最低对比）**

- 深色：`--nvui-line` 0.07 → `0.05`、`--nvui-line-2` 0.12 → `0.08`、`--nvui-dash` 0.17 → `0.14`、
  `--nvui-block-line` 0.06 → `0.04`、`--nvui-block-line-2` 0.1 → `0.07`、
  `--nvui-glass-line` 0.06 → `0.03`、`--nvui-glass-highlight` 0.04 → `0.03`。
- 浅色：`--nvui-line` 0.08 → `0.06`、`--nvui-line-2` 0.14 → `0.10`、`--nvui-dash` 0.22 → `0.18`、
  `--nvui-block-line` 0.06 → `0.045`、`--nvui-block-line-2` 0.1 → `0.07`、
  `--nvui-glass-line` 0.35 → `0.18`、`--nvui-glass-highlight` 0.45 → `0.30`。
- 效果：分隔线、控件边、玻璃边进一步减弱，浮层近似无边框；玻璃 bg / 文字 / AA 政策不变。

**焦点环单圈 1.5px（修复输入框双描边）**

- `--nvui-focus-ring-w` 2px → `1.5px`；`.nvui-input:focus-visible` 删除内圈 `box-shadow: inset ... accent-line`，
  只保留单圈 `outline: var(--nvui-focus-ring-w) solid var(--nvui-focus-ring-color)`（其它组件本就单圈）。

**面板固定尺寸（折叠展开不跳变）**

- `.nvui-panel` 高度改为固定：桌面 `height: var(--nvui-panel-max-h)`（88vh）、≤600px 抽屉 `height: 92dvh`；
  宽度仍 `min(var(--nvui-panel-width), 100%)`；折叠 / 展开与 tab 切换只改变 body 内滚动内容，外框尺寸不变。

**隐藏滚动条（保留滚动能力）**

- `.nvui-panel-body` 与 `.nvui-modal-body` 增加 `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`；
  内容仍可滚动（`overflow-y: auto` / `overscroll-behavior: contain` 不变）。

**文档**

- README 升 v2.1.1：§3 设计原则补「描边再减弱 / 单圈焦点环」，§4 token 表更新全部新值，
  §7.3 弹窗正文与 §7.6 输入框聚焦说明改为单圈 1.5px，第 12 章补「固定尺寸不跳变 / 滚动条隐藏但可滚动」；
  新增 `### 10.6 v2.1.0 → v2.1.1`；§11 增加 v2.1.1 记录；CHANGELOG / package.json 升 2.1.1。

## v2.1.0（2026-10-17）

新增 **SillyTavern 插件面板布局标准（桌面 / 手机）**（小版本；无破坏性变更）。

**新增面板布局标准**

- 电脑（>600px）：`.nvui-overlay.is-panel > .nvui-panel` 居中玻璃面板，宽 `min(var(--nvui-panel-width), 100%)`（默认 880px）、
  高 `var(--nvui-panel-max-h)`（默认 88vh），顶部 `.nvui-tabs` 做分区导航。
- 手机（≤600px）：面板变为底部抽屉（bottom sheet）——底部对齐、全宽、`92dvh`、仅上圆角；隐藏顶部 tabs，
  显示 `.nvui-sheet-handle`（40×4 拖拽把手）与 `.nvui-bottom-nav` 底部图标导航（自动加 `env(safe-area-inset-bottom)`）。
- 同一份 DOM 随 600px 断点自动切换；`.nvui-panel-body` 是唯一滚动层，面板本身不滚动。
- 新增 10 个组件类（组件类总数 68 → 78）：`.nvui-panel`、`.nvui-panel-header`、`.nvui-panel-title`、
  `.nvui-panel-actions`、`.nvui-panel-body`、`.nvui-panel-footer`、`.nvui-panel-heading`、
  `.nvui-sheet-handle`、`.nvui-bottom-nav`、`.nvui-bottom-nav-item`。
- 新增 2 个尺寸令牌（token 总数 107 → 109）：`--nvui-panel-width: 880px`、`--nvui-panel-max-h: 88vh`。
- 新增状态类：`.nvui-overlay.is-panel`（面板模式遮罩）、`.nvui-switch-row.is-feature`
  （高亮功能行：左侧主色竖条 + 淡底）、`.nvui-bottom-nav-item.is-active`（手机导航当前项）。
- 排列规范（只参考常见插件面板截图的**结构**，视觉沿用 Kit Flat Glass 紫色主题）：
  面板标题栏（标题 + 次级操作 + 关闭）→ 分区导航（桌面顶部 tabs / 手机底部导航）→
  内容区（`.nvui-panel-heading` 分区标题 + 版本徽标、`is-feature` 功能开关行、`.nvui-acc` 折叠分组列表）→
  可选 `.nvui-panel-footer`。
- 无障碍：`.nvui-panel` 上 `role="dialog"` + `aria-modal="true"` + `aria-labelledby`；桌面 tabs 沿用
  tablist/tab/tabpanel 语义；手机底部导航 `<nav>` + `<button>` + `aria-current="page"`；关闭按钮 `aria-label`；
  焦点管理沿用 README §2.3 配方。
- 新增 JS 约定：桌面 tab / 手机底部导航 / tabpane 共用同一份激活状态
  （`aria-selected` / `aria-current` / `tabindex`），README 第 12 章给出同步配方。
- 文档：README 新增第 12 章「SillyTavern 插件面板布局标准（桌面 / 手机）」，原「许可」顺延为第 13 章；
  新增 `### 10.5 v2.0.1 → v2.1.0 新增面板布局标准`；§1 / §4 / §6.5 / §11 同步计数与令牌；CHANGELOG / package.json 升 2.1.0。

无破坏性变更：不删除/重命名 token 与类名，不改既有 DOM 契约；原有 `.nvui-modal` 弹窗继续可用，面板布局标准为可选新能力。

## v2.0.1（2026-10-17）

用户反馈驱动的补丁迭代（**无 token 增删、无破坏性 DOM/类名变化**；仅新增可选第 68 个组件类 `.nvui-tabs-indicator`。覆盖 CSS 即可升级；需业务适配的是 popover 级玻璃上的次要文字改用正文色，以及可选接入标签粘连指示器）。

**玻璃更透 / 浮层描边更柔和**

- 深色：`--nvui-glass-bg` 0.72 → `rgba(22, 26, 36, 0.64)`；`--nvui-glass-bg-strong` 0.88 → `rgba(22, 26, 36, 0.8)`；
  遮罩 `--nvui-overlay-bg` 0.55 → `rgba(6, 8, 14, 0.62)`（遮罩加深补偿 AA）；
  `--nvui-glass-line` 0.14 → `rgba(255, 255, 255, 0.06)`；`--nvui-glass-highlight` 0.1 → `rgba(255, 255, 255, 0.04)`；
  `--nvui-glass-blur` 18px → `20px`；`--nvui-glass-blur-sm` 10px → `12px`；`--nvui-glass-saturate` 140% → `150%`。
- 浅色：`--nvui-glass-bg-strong` 0.88 → `rgba(255, 255, 255, 0.8)`；`--nvui-glass-line` 0.7 → `rgba(255, 255, 255, 0.35)`；
  `--nvui-glass-highlight` 0.9 → `rgba(255, 255, 255, 0.45)`；`--nvui-glass-bg` 与遮罩不变。
- 效果：吐司静态形态、悬浮面板、工具提示的受光边与内高光几乎不可见，玻璃更通透，不再出现突兀亮描边。

**动效补强（关键帧 14 → 16）**

- 新增 `nvui-tabpane-in`（`.nvui-tabpane.is-active` 淡入 + 上移 6px）与 `nvui-switch-on`（`.nvui-switch-row input[type="checkbox"]:checked` 轨道回弹 0.92 → 1.04 → 1）。
- 开关按住时滑钮沿运动方向 `scaleX(1.12)` 拉伸（iOS 风格），松手弹簧回位；勾选态按住同时保留 `translateX`。
- 进度条叠 `::after` 扫光（`nvui-shimmer` 循环）；不确定进度关键帧增加 `scaleX` 呼吸（0.6 → 1 → 0.8）。
- 标签页新增可选「粘连」滑动指示器 `.nvui-tabs-indicator`（**v2.0.1 追加，第 68 个组件类**）：
  `stretch-then-settle` 算法（先拉长到「旧位置 ∪ 新位置」，`requestAnimationFrame` 两帧后收缩到目标）+ spring 过渡；
  无 JS 或未加 `is-indicator` 时自动回退为按钮自身高亮。README §7.7 提供约 25 行 JS 配方（点击 / 键盘 / resize / 字体加载同步）。

**减少动态效果与「强制播放动效」演示开关**

- 本机/系统开启「减少动态效果」（`prefers-reduced-motion: reduce`）时，kit 全部动效按无障碍红线降级为 `0.01ms`
  （含 `animation-delay` / `animation-iteration-count` 重置、`transition-duration: 0.01ms`）——这是预期行为，不是 bug。
- `preview.html` 顶部新增「强制播放动效」演示开关：给 `<body>` 加 `pv-force-motion`，并由 preview 局部 CSS 在 reduce 下覆盖动效时长
  （spinner / skeleton / progress / status-dot 等循环动画恢复 `infinite`）；支持 URL 参数 `?motion=1`，可与 `?theme=light`、`?solid=1` 叠加。
- 该开关与 `pv-` 前缀样式**仅存在于 preview.html，不进入 kit**；生产环境请尊重系统偏好（见 README §2.6）。

**数字输入框**

- 隐藏浏览器原生白色步进按钮（`::-webkit-inner-spin-button` / `::-webkit-outer-spin-button` 置 `-webkit-appearance: none; margin: 0`，并 `appearance: textfield`），暗色主题下不再突兀；
  键盘 ↑/↓ 与滚轮仍可调值；需要可见步进器时业务侧自建按钮并复用 `.nvui-icon-btn`。

**AA 政策调整（popover 级只承诺正文）**

- 深色弹窗级（遮罩 0.62 + 玻璃 0.64，纯白最坏）：text 10.33 / text-2 4.70（双达标）。
- 深色 popover 级（强玻璃 0.80，纯白最坏）：只承诺 `--nvui-text` 7.76；`--nvui-text-2` 为 3.53 不达标
  → popover 玻璃组件（`.nvui-floating` / `.nvui-tooltip` / `.nvui-toast` / `.nvui-glass`）正文必须用 `--nvui-text`，
  `.nvui-tooltip` 的 `color` 已从 `text-2` 改为 `text`。
- 浅色弹窗级（遮罩 0.30 + 玻璃 0.78，纯黑最坏）：text 9.31 / text-2 4.64；浅色 popover 级（0.80，纯黑最坏）：text 9.66 / text-2 4.81。
- 典型深色宿主 `#161a24` 下浅色弹窗级为 9.70/4.83（参考口径）。
- README §4.4 同步重写 AA 表与政策（含「popover 玻璃上的次要说明也用正文色」）；README 新增 `### 10.4 v2.0.0 → v2.0.1 修订说明`。

**文档**

- README/CHANGELOG/package.json 升 v2.0.1；README 更新 §2.4 / §4.1 / §4.2 / §4.4 / §10.3.2 玻璃取值与 AA 台词；
  §6.4.4 与 §7.17 关键帧 14 → 16；§7.5 开关按压拉伸与勾选回弹、§7.6 数字输入框隐藏原生步进按钮、
  §7.7 标签面板入场 + 新增「粘连」指示器 DOM 与 stretch-then-settle JS 配方（无 JS 回退）、
  §7.13 进度条扫光、§7.15 工具提示正文色；新增 §2.6「动效降级与强制播放动效演示开关」；
  §10.4 增补标签粘连指示器与演示强制动效；§11 增加 v2.0.1 记录（兼容性约定 2.0.x 保持）。

## v2.0.0（2026-10-17）

「Flat Glass（扁平玻璃）」设计语言升级：静态区块扁平化、浮层玻璃拟态、动效体系化、能力可降级。

**破坏性变更**

- 删除 `--nvui-shadow-accent`（主按钮悬停发光）：投影发光与「扁平优先」目标冲突；
  主按钮 hover 改为纯色加深（`--nvui-accent-strong-hover`）+ 顶部内高光。引用该 token 的插件需删除相关声明。
- 折叠面板 DOM 变更：`.nvui-acc-body` 改为 `grid-template-rows: 0fr ↔ 1fr` 高度动画容器，
  正文**必须**再包一层 `<div class="nvui-acc-inner">`（`min-height:0; overflow:hidden` + 左右内边距），
  否则展开内容会被裁剪为 0 高度。
- 视觉取值升级：`--nvui-overlay-bg` 深色改为 `rgba(6, 8, 14, 0.55)`、浅色 `rgba(15, 23, 42, 0.3)`；
  `--nvui-shadow-modal` / `--nvui-shadow-pop` 改为玻璃阴影（环境投影 + `inset 0 1px 0 var(--nvui-glass-highlight)`）；
  `--nvui-transition` / `--nvui-transition-slow` 改为组合引用新的时长/缓动令牌（`--nvui-duration-*` / `--nvui-ease-*`）。
- 焦点环统一：组件不再各写 `outline: 2px solid var(--nvui-accent)` 之类的散装样式，
  统一为 `outline: var(--nvui-focus-ring-w) solid var(--nvui-focus-ring-color)` + `outline-offset: var(--nvui-focus-ring-offset)`。
- 弹窗圆角改用新增的 `--nvui-radius-xl`（20px）；`--nvui-radius-lg`（16px）改用于吐司/悬浮面板/窄屏弹窗。

**新增**

- 玻璃层 7 令牌：`--nvui-glass-bg`（`rgba(22, 26, 36, 0.72)`）、`--nvui-glass-bg-strong`（`rgba(22, 26, 36, 0.88)`）、
  `--nvui-glass-line`、`--nvui-glass-highlight`、`--nvui-glass-blur`（18px）、`--nvui-glass-blur-sm`（10px）、`--nvui-glass-saturate`（140%）；
  浅色主题补齐玻璃 4 色（`rgba(255, 255, 255, 0.78)` / `0.88` 等）。
- 焦点环 3 令牌：`--nvui-focus-ring-color` / `--nvui-focus-ring-w` / `--nvui-focus-ring-offset`。
- 动效体系 12 令牌：时长 `--nvui-duration-fast|base|slow`、缓动 `--nvui-ease-standard|emphasized|spring`、
  组合 `--nvui-transition` / `--nvui-transition-slow`、循环/序列 `--nvui-shimmer-duration` / `--nvui-pulse-duration` /
  `--nvui-stagger-step` / `--nvui-enter-distance`；`--nvui-transition` 取值改为组合引用。
- 骨架屏 2 令牌（`--nvui-skeleton-bg` / `--nvui-skeleton-shine`）与 `--nvui-radius-xl`；浅色主题同步补齐。
- 新增 `--nvui-on-accent: #ffffff`（主色填充上的文字/图标色）：主按钮不再借用开关滑钮的 `--nvui-knob`，消除语义耦合（AUD-14）；两主题同值，浅色主题无需重复覆盖。
- 新增 14 个类：`.nvui-glass`（玻璃工具类）、`.nvui-solid`（实心扁平模式根开关）、`.nvui-acc-inner`（折叠裁切层）、
  `.nvui-toast` / `.nvui-toast-stack`（吐司与堆栈）、`.nvui-progress` / `.nvui-progress-bar`（进度条）、
  `.nvui-skeleton`（骨架屏）、`.nvui-status-dot`（状态点）、`.nvui-fade-in` / `.nvui-slide-up` / `.nvui-pop-in` /
  `.nvui-stagger` / `.nvui-pulse`（动效工具类）。
- 动效系统：14 个 `nvui-` 前缀关键帧（spin / fade-in / slide-up / pop-in / overlay-in/out / modal-in/out /
  toast-in/out / tab-select / shimmer / progress-indeterminate / pulse）；弹窗与遮罩进出场、折叠高度动画、
  标签页激活弹跳、开关弹簧滑钮、按钮/图标按钮按压缩放、吐司进出场、骨架屏扫光、不确定进度、状态点呼吸。
- 能力降级：每个 `backdrop-filter` 同时写 `-webkit-backdrop-filter`；`@supports not` 回退不透明；
  `.nvui-solid` 实心模式；`prefers-reduced-transparency: reduce`；`forced-colors: active`（`CanvasText` 描边）；
  窄屏弹窗模糊降档；`prefers-reduced-motion` 降级补充 `animation-delay` / `animation-iteration-count` 重置。
- AA 安全玻璃：按 sRGB 逐通道合成验算，最坏宿主背景（深色主题纯白 `#ffffff` / 浅色主题纯黑 `#000000`）下
  玻璃表面上的 `--nvui-text` 与 `--nvui-text-2` 仍 >= 4.5:1（深色 10.52/4.79、10.30/4.69；浅色 9.31/4.64、11.80/5.88；
  典型深色宿主 `#161a24` 下为 9.70/4.83、12.15/6.05）。
- 测试门禁：`test/test-ui-kit.js` 升级为 v2 守护——107 个核心 token 显式清单、玻璃合成对比度验算、
  14 关键帧全部被引用、focus ring 统一 token、折叠 grid 高度动画、降级块存在性、`!important` 预算（<=8）、
  文案取值防漂移（README 玻璃精确值）。

**可访问性修复（阶段 1 审计 AUD-06 / AUD-11 / AUD-13 / AUD-14）**

- 状态行对比度：`.nvui-status-time` / `.nvui-status-file` 改用 `--nvui-text-2`、去掉 `opacity` 降透明度，修正 11px 时间戳/路径在玻璃与浅色宿主下对比度不足的问题。
- 开关非文本对比度（WCAG 1.4.11）：`--nvui-switch-off-bg` 深色改为 `rgba(255, 255, 255, 0.34)`、浅色改为 `rgba(15, 23, 42, 0.47)`；深色 `--nvui-knob-off` 改为 `var(--nvui-text)`；关闭态轨道与页面背景、滑钮与轨道均 >= 3:1。
- 弹窗焦点管理（AUD-13）：README 补充「打开时把焦点移入弹窗（优先主按钮 / 标题 `tabindex="-1"`）、Tab 与 Shift+Tab 焦点陷阱、关闭后焦点归还触发元素」的最小实现配方，避免 `aria-modal="true"` 只停留在标记层。
- 焦点环统一走 token；`prefers-reduced-motion` 降级补齐 `animation-delay` / `animation-iteration-count` 重置。

**文档**

- README 重写为 v2 规范（设计原则/玻璃 AA/动效体系/新组件/宿主红线第 9 条/迁移对照），
  新增 `### 10.3 v1.1.0 → v2.0.0 迁移对照`；新增 `AUDIT.md` 架构审核报告；`package.json` 升级为 2.0.0。

## v1.1.0（2026-10-17）

- 独立项目化：自带 `package.json`、`LICENSE`、`CHANGELOG.md`、`test/` 与 `.gitignore`；
  不再依赖来源仓库的 `style.css`、根目录测试或相对路径链接，**可整目录移动到任意文件夹/仓库**。
- `README.md` 去除对来源仓库的相对链接，补充独立项目结构、独立运行方式与版本约定。
- 守护测试改为项目内自洽：内置核心 token 金标准取值、kit 版本在四处（package.json / CSS 头 / README / CHANGELOG / preview）一致；
  不再读取来源仓库文件，`cd` 进本目录即可运行。
- 来源说明：从 novel-stream 扩展 v1.19.1 的浮动 UI 提炼；迁移对照表保留为历史参考。

## v1.0.0（2026-10-17）

- 首个版本：84 个设计令牌（深色 + 浅色覆盖）、13 个组件族、离线组件预览页、设计规范文档、守护测试。
