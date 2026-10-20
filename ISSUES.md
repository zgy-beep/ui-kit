# ui-kit Issue 追踪

本文件是 `zgy-beep/ui-kit` 的**本地 issue 追踪表**，与 GitHub Issues 双向对应：

- **GitHub Issues**：面向使用者提问、公开讨论 → https://github.com/zgy-beep/ui-kit/issues
- **本文件**：面向维护者的工作队列（未确认的怀疑项、待验证的性能项、内部约定），**不代表已确认的公开 bug**

规则：

1. 任何在 review / 实机测试中发现的**疑似**问题，先登记到本文件「待办」区，写明**复现证据**（文件路径 + 行号 / 实机观测数据），不允许凭印象下结论。
2. 确认是真问题后：修代码 → 补回归断言（`test/test-ui-kit.js` 或实机脚本）→ 更新 CHANGELOG → 在本文件标记「已修复」并写明修复版本。
3. 涉及公开行为或使用体验的，**同时**在 GitHub 建 issue，编号写回本文件。
4. 状态取值：`待办` / `修复中` / `已修复` / `已确认-不修` / `已上报`。

---

## 已修复

| # | 问题 | 严重度 | 状态 | 证据 | 修复 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `nvui-api.js` 的 `el()` 支持 `html` 属性直写 `innerHTML`，构成 XSS 汇聚点 | P0 安全 | 已修复 | `nvui-api.js` 原 L73 `else if (k === 'html') node.innerHTML = String(v);` | 删除该分支，只保留 `text` → `textContent`，其余走 `setAttribute`。GitHub Issue #1 |
| 2 | `animationend` 冒泡截断退场动画：面板内子动画（如 `.nvui-tabpane-in`）结束会冒泡到 overlay，导致 overlay 自身退场被提前截断 | P0 正确性 | 已修复 | 实机对照实验：A 组（切 tab 后 30ms 关闭）overlay 退场在 207ms 被 hidden（截断）；B/C 组正常 | `closeLayer` / 吐司 `dismiss()` 的 `onAnimEnd` 增加 `event.target` 校验（+ 吐司校验 `animationName`） |
| 3 | 每次 `createPanel` 都在 `document` 上挂 `keydown` 监听且从不注销 → 监听器泄漏 | P1 正确性 | 已修复 | `nvui-api.js` 原 `on(document, 'keydown', ...)`；实机：第 3 个面板新增 document 监听数 = 1 | 引入全局单例 Esc 调度器 `escapeStack`，只由最上层可见浮层响应；面板销毁时自动注销 |
| 4 | 同名面板产生重复 `id`（含 `-layer` / `-overlay` / `-title` 派生 id），`aria-labelledby` 指向错乱 | P1 可访问性 | 已修复 | 实机：两个 `same_base` 面板得到相同 id | 新增 `uniqueId()` + `idTaken()`（同时检测四个派生 id），冲突时才加后缀 |
| 5 | `aria-modal="true"` 但无焦点陷阱，Tab 会跑到面板外 | P1 可访问性 | 已修复 | `nvui-api.js` `createPanel` 仅有 `aria-modal` 声明 | 面板内实现 focus trap（Tab / Shift+Tab 循环） |
| 6 | 焦点归还失败，焦点掉到 `body` | P1 可访问性 | 已修复 | 实机：Esc 关闭后 `activeId: ""`。根因：ST wand 菜单点击菜单项后自动收起，触发按钮不可聚焦，`opener.focus()` 静默失败 | 新增 `isFocusable()` 校验 + `focusFallback` 三级兜底（触发元素 → focusFallback → 面板本身） |
| 7 | 面板 / 吐司**被酒馆内容压在后面**（用户截图报障） | **P0 层级** | 已修复 | 实机命中栈：面板中心点 `elementsFromPoint` 顶层是宿主 `fa-solid fa-address-card`，kit 元素排在第 5 位。根因：载体 `dialog.nvui-tl` 是 `position:fixed` + `z-index:auto` → 创建层叠上下文，整体只相当于 z-index 0，而 ST `#sheld` 是 `z-index:30` 的 absolute 元素 | 载体显式 `z-index: var(--nvui-z-overlay)`；吐司载体加 `.nvui-tl-toast`（`--nvui-z-tooltip`）。实测 5 个采样点全部 `oursOnTop: true` |
| 11 | `.nvui-progress-bar::after` 的 shimmer 无限动画常驻（0% / 100% 时也在跑） | P2 性能 | 已修复 | `components.css` `.nvui-progress-bar::after`。扫光是「进行中」的语义装饰，0% 尚未开始、100% 已结束，此时跑无限循环动画纯属浪费合成层资源 | 新增**可选**状态类 `.nvui-progress.is-idle`（0%）/ `.is-complete`（100%），CSS 侧 `animation: none` 停掉扫光；`NVUI.progress()` 的 `setValue()` 自动维护这两个类（`syncActivity`）。**不确定进度（`is-indeterminate`）永远保持扫光**。未新增 token、未改既有 DOM 契约（手写 DOM 不加类时行为与旧版一致） |
| 13 | `prefers-reduced-motion` 门禁只覆盖 `.nvui-scope *` / `dialog.nvui-tl *`，宿主容器内未加 `.nvui-scope` 时组件动画不会降级（无障碍红线被绕过） | P2 无障碍 | 已修复 | `components.css` reduced-motion 块（原 L2069-2072）。宿主把 kit 组件挂进自己的容器却没加 `.nvui-scope` → 层 1 通配不生效 → 组件动画照常播放 | 降级块改为**两层**：层 1 保留 `.nvui-scope *` / `dialog.nvui-tl *` 通配（覆盖作用域内的自定义子元素），层 2 用 `:is(...)` **逐个点名 27 个自身带 animation/transition 的 kit 类**（含 `::before`/`::after` 变体 + `.nvui-stagger > *` + 开关 checkbox）。**未新增 `!important`**（仍 5 个，预算 ≤ 8 保持不变）。回归断言：扫描 `components.css` 里所有带 `animation:`/`transition:` 的规则，提取其 kit 基类，逐一断言出现在降级块选择器中 |
| 14 | `preview.html` 的 `replayMotion` 逐节点读 `offsetWidth` 强制回流（N 节点 = N 次同步布局）；滚动监听（`capture: true`）未节流，一次滚动触发数十次回调 | P3 性能 | 已修复 | `preview.html` 原 `replayMotion` 内 `void node.offsetWidth`（逐节点）+ `window.addEventListener('scroll', repositionTip, true)` 直接调用 | `replayMotion` 改为「批量摘类 → 全局只读一次 `document.body.offsetWidth` → 批量挂回」，并对 stagger 子项单独触发回流（子项数远小于摘类节点数）；`repositionTip` 用 `requestAnimationFrame` 合并为每帧至多一次。回归断言：断言重播函数不含 `void node.offsetWidth` 且含 `void document.body.offsetWidth`；断言滚动处理含 `requestAnimationFrame` + `repositionRaf` |
| 15 | 宿主 `body.no-blur` 全局禁用 `backdrop-filter` 时，kit 玻璃只剩半透明底色，下层文字透出重影 | P2 视觉 | 已修复 | 宿主规则实为 `body.no-blur * { backdrop-filter: unset !important }`（`public/css/toggle-dependent.css` L368）。浏览器**仍支持** backdrop-filter，故 `@supports not` 降级块不触发 → 玻璃底色半透明 → 下层文字直接透出 | `nvui-api.js` 新增 `detectGlassSupport()` / `syncGlassFallback()`：**造隐藏 `.nvui-glass` 探针读渲染后的实际计算值**（`getComputedStyle().backdropFilter`），为 `none` 即判定被外部禁用 → 自动给根节点挂 `.nvui-solid` 实心回退。不猜宿主类名（避免耦合）。`createPanel()` / `showToast()` 已内置调用。实机 `test/st-glass-fallback-check.js` **9/9 全绿**：宿主 no-blur 下探测值 = `none`、面板背景 = `rgb(22,26,36)`（不透明）、移除 no-blur 后探测值恢复 `blur(20px) saturate(1.5)`、全程零控制台错误 |

---

## 待办

| # | 问题 | 严重度 | 状态 | 证据 / 说明 |
| :--- | :--- | :--- | :--- | :--- |
| 8 | 进度条 `.nvui-progress-bar` 用 `transition: width` → 逐帧触发布局重排 | P2 性能 | 待办 | `components.css` L1173。改 `transform: scaleX()` 可上合成层，但会改变 `--nvui-progress-bar` 的宽度语义（需保证圆角与 min-width 表现一致），且 `.nvui-progress-bar::after` 的 shimmer 是 `inset:0` + `translateX` 百分比动画，改 scale 后 shimmer 会被缩放 → 需要改成独立的绝对定位层 |
| 9 | tabs 粘连指示器 `.nvui-tabs-indicator` 的 `transition` 含 `width` / `height` → 逐帧重排 | P2 性能 | 待办 | `components.css` L652-655。指示器宽度/高度是 JS 写入的 `--nvui-tab-ind-w/h`，与 `--nvui-tab-ind-x/y`（transform）不同源，要一起改成 scale 方案需要重新设计 JS 契约（README §7.7 配方） |
| 10 | 折叠面板 `.nvui-acc-body` 用 `transition: grid-template-rows`（0fr→1fr） | P2 性能 | 待办 | `components.css` L833-839。grid-template-rows 过渡虽可过渡但会逐帧重排；替代方案（max-height 猜测值 / JS 计算高度）各有精度或复杂度代价 |
| 12 | 双层 `backdrop-filter`（`.nvui-overlay` 全屏 blur + `.nvui-panel` blur） | P2 性能 | 待办 | `components.css` L122 / `.nvui-panel`。全屏 backdrop-filter 在低端 GPU 上开销显著；窄屏已有降档到 `--nvui-glass-blur-sm`，但桌面端仍是双层 |
| 16 | 宿主用 `showModal()` 打开弹窗（真 top layer）时，kit 浮层无法越层 | P2 层级 | 待办 | top layer 优先级高于任何 z-index。当前方案（z-index）无法覆盖真 top layer 元素。若需绝对可靠，需改用 `popover=manual` 载体（实测 `popover=manual` 能压过 `z-index:2147483647` 的普通元素），但会变更 DOM 契约，属破坏性变更 |

---

## 已确认-不修

| # | 事项 | 说明 |
| :--- | :--- | :--- |
| - | 复用 `--nvui-z-overlay` 作为载体档 | 最初为避免「109 令牌」计数契约变动而复用 `--nvui-z-overlay`。**该方案已被推翻**：载体与子浮层混用同一档位语义不清，且 `--nvui-z-overlay` 实际比载体高一档，层级语义倒挂。最终改为新增专属 `--nvui-z-layer: 1000000`，token 总数 109 → 110，版本号按语义化规则升 **v2.3.0**（小版本，新增 token 不破坏既有取值） |
| - | 载体改用 `popover=manual` | 见待办 #16：能免疫一切 z-index，但变更 DOM 契约（`<dialog class="nvui-tl">` → `<div popover="manual">`），属破坏性变更，需单独规划版本 |

---

## 实机测试脚本

| 脚本 | 覆盖 |
| :--- | :--- |
| `test/st-live-check.js` | 运行时行为回归 6 项：冒泡截断 / Esc 单例 / destroy / id 唯一 / focus trap / 焦点归还 |
| `test/st-template-check.js` | ST 模板实机 7 项：扩展加载 / 菜单开面板 / tab 同步 / 吐司 / Esc 焦点归还 / 设置回写 / 移动端布局 |
| `test/st-layer-check.js` | 层级回归：面板 5 采样点是否在宿主之上 / 吐司是否高于面板 / 关闭后还原 |
| `test/st-layer-probe.js` | 层级根因探针：对比 dialog.show / showModal / popover / 固定 div 四种载体的命中顺序 |
| `test/st-glass-probe.js` | 玻璃生效探测：宿主 no-blur 下 backdrop-filter 是否被关掉 |
| `test/st-glass-fallback-check.js` | 玻璃实心回退（#15）9 项：宿主 no-blur 下探测值 / 根节点自动挂 `.nvui-solid` / 面板背景不透明 / 移除 no-blur 后对照恢复 blur / 零控制台错误 |
| `test/st-focus-probe.js` | 焦点归还根因探针 |
| `test/st-toplayer-probe.js` | top-layer 行为探针：实测非模态 `dialog.show()` 是否进浏览器 top layer（结论：不进） |

运行环境：本机 SillyTavern `T:\Github\SillyTavern\APP\SillyTavern`（v1.19.0，http://127.0.0.1:8000）。
用 `playwright-core` 直连本机 Chrome（`NODE_PATH` 注入模块解析路径）。
