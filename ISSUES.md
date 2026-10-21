# ui-kit Issue 追踪

本文件是 `zgy-beep/ui-kit` 的**本地 issue 追踪表**，与 GitHub Issues 双向对应：

- **GitHub Issues**：面向使用者提问、公开讨论 → https://github.com/zgy-beep/ui-kit/issues
- **本文件**：面向维护者的工作队列（未确认的怀疑项、待验证的性能项、内部约定），**不代表已确认的公开 bug**

规则：

1. 任何在 review / 实机测试中发现的**疑似**问题，先登记到本文件「待办」区，写明**复现证据**（文件路径 + 行号 / 实机观测数据），不允许凭印象下结论。
2. 确认是真问题后：修代码 → 补回归断言（`test/test-ui-kit.js` 或实机脚本）→ 更新 CHANGELOG → 在本文件标记「已修复」并写明修复版本。
2b. 若经**实机测量**证明并非真问题（如：累计布局耗时高但帧间隔与基线一致 → 无可感知卡顿），
    则转入「已确认-不修」区，并**附上实测数据与复现脚本**。禁止仅凭推理下「不修」结论。
2c. 判定性能类问题必须看**帧间隔**，不能只看布局次数 / 累计布局耗时（详见 README §13.6）。
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
| 7 | 面板 / 吐司**被酒馆内容压在后面**（用户截图报障） | **P0 层级** | 已修复 | 实机命中栈：面板中心点 `elementsFromPoint` 顶层是宿主 `fa-solid fa-address-card`，kit 元素排在第 5 位。根因：载体 `dialog.nvui-tl` 是 `position:fixed` + `z-index:auto` → 创建层叠上下文，整体只相当于 z-index 0，而 ST `#sheld` 是 `z-index:30` 的 absolute 元素 | 载体显式 `z-index: var(--nvui-z-layer)`（1000000，专属载体档）；吐司载体加 `.nvui-tl-toast`（`--nvui-z-tooltip`）。实测 5 个采样点全部 `oursOnTop: true` |
| 11 | `.nvui-progress-bar::after` 的 shimmer 无限动画常驻（0% / 100% 时也在跑） | P2 性能 | 已修复 | `components.css` `.nvui-progress-bar::after`。扫光是「进行中」的语义装饰，0% 尚未开始、100% 已结束，此时跑无限循环动画纯属浪费合成层资源 | 新增**可选**状态类 `.nvui-progress.is-idle`（0%）/ `.is-complete`（100%），CSS 侧 `animation: none` 停掉扫光；`NVUI.progress()` 的 `setValue()` 自动维护这两个类（`syncActivity`）。**不确定进度（`is-indeterminate`）永远保持扫光**。未新增 token、未改既有 DOM 契约（手写 DOM 不加类时行为与旧版一致） |
| 13 | `prefers-reduced-motion` 门禁只覆盖 `.nvui-scope *` / `dialog.nvui-tl *`，宿主容器内未加 `.nvui-scope` 时组件动画不会降级（无障碍红线被绕过） | P2 无障碍 | 已修复 | `components.css` reduced-motion 块（原 L2069-2072）。宿主把 kit 组件挂进自己的容器却没加 `.nvui-scope` → 层 1 通配不生效 → 组件动画照常播放 | 降级块改为**两层**：层 1 保留 `.nvui-scope *` / `dialog.nvui-tl *` 通配（覆盖作用域内的自定义子元素），层 2 用 `:is(...)` **逐个点名 27 个自身带 animation/transition 的 kit 类**（含 `::before`/`::after` 变体 + `.nvui-stagger > *` + 开关 checkbox）。**未新增 `!important`**（仍 5 个，预算 ≤ 8 保持不变）。回归断言：扫描 `components.css` 里所有带 `animation:`/`transition:` 的规则，提取其 kit 基类，逐一断言出现在降级块选择器中 |
| 14 | `preview.html` 的 `replayMotion` 逐节点读 `offsetWidth` 强制回流（N 节点 = N 次同步布局）；滚动监听（`capture: true`）未节流，一次滚动触发数十次回调 | P3 性能 | 已修复 | `preview.html` 原 `replayMotion` 内 `void node.offsetWidth`（逐节点）+ `window.addEventListener('scroll', repositionTip, true)` 直接调用 | `replayMotion` 改为「批量摘类 → 全局只读一次 `document.body.offsetWidth` → 批量挂回」，并对 stagger 子项单独触发回流（子项数远小于摘类节点数）；`repositionTip` 用 `requestAnimationFrame` 合并为每帧至多一次。回归断言：断言重播函数不含 `void node.offsetWidth` 且含 `void document.body.offsetWidth`；断言滚动处理含 `requestAnimationFrame` + `repositionRaf` |
| 15 | 宿主 `body.no-blur` 全局禁用 `backdrop-filter` 时，kit 玻璃只剩半透明底色，下层文字透出重影 | P2 视觉 | 已修复 | 宿主规则实为 `body.no-blur * { backdrop-filter: unset !important }`（`public/css/toggle-dependent.css` L368）。浏览器**仍支持** backdrop-filter，故 `@supports not` 降级块不触发 → 玻璃底色半透明 → 下层文字直接透出 | `nvui-api.js` 新增 `detectGlassSupport()` / `syncGlassFallback()`：**造隐藏 `.nvui-glass` 探针读渲染后的实际计算值**（`getComputedStyle().backdropFilter`），为 `none` 即判定被外部禁用 → 自动给根节点挂 `.nvui-solid` 实心回退。不猜宿主类名（避免耦合）。`createPanel()` / `showToast()` 已内置调用。实机 `test/st-glass-fallback-check.js` **9/9 全绿**：宿主 no-blur 下探测值 = `none`、面板背景 = `rgb(22,26,36)`（不透明）、移除 no-blur 后探测值恢复 `blur(20px) saturate(1.5)`、全程零控制台错误 |

| 17 | 宿主 `showModal()` 模态期间，kit 浮层被压住且**完全无法交互**（用户点了没反应，无任何视觉提示）；且 v2.3.0 README §13.5.1 对照表 F 行「`popover=manual` 能压过一切」为**错误论断** | P1 交互 / P1 文档 | 已修复 | 实机探针（`/tmp/probe-carrier*.js`，真实 ST 宿主）：① `popover="manual"` 无论 show 先后**都压不过** `showModal()` 模态；② 普通 div + `z-index:2147483647` 同样不行；③ 根因**不是 z-index**，而是 `showModal()` 给**整页**加 `inert`，`inert` 元素不参与命中测试（`elementsFromPoint` 不返回），也无法获得焦点 | **改为「主动让位」而非硬压**：① `components.css` 新增降级态 `dialog.nvui-tl.is-host-modal`（`pointer-events:none` + `opacity:0.35` + `grayscale(0.6)`，子浮层一并让位）；② `nvui-api.js` 新增 `countHostModals()` / `syncHostModalState()` / `getCarrierState()`；③ 装幂等 watcher（`MutationObserver` 监听 `dialog[open]` + 捕获 `close`），宿主模态**动态开关**时自动降级/还原；④ README §13.5.1 F 行更正 + 新增 §13.7。实机 `test/st-carrier-host-modal-check.js` **18/18 全绿**。GitHub Issue #4 |

---

## 待办

> 规则：疑似问题先登记在此区并写明**复现证据**（文件路径 + 行号 / 实机观测数据），
> 不允许凭印象下结论。确认是真问题后再转「已修复」或「已确认-不修」。

| # | 问题 | 严重度 | 状态 | 证据 / 说明 |
| :--- | :--- | :--- | :--- | :--- |
| — | **暂无待办** | — | — | 上一轮登记的 5 项（#8 / #9 / #10 / #12 / #16）已全部经**实机测量**判定为「已确认-不修」，转入下方「已确认-不修」区并附实测数据。新问题请先按上方规则登记到本区。 |


---

## 待修复

> **2026-10-20 系统性 Review 新增区**。本轮共登记 24 条（高 7 / 中 10 / 低 7），
> 完整审查报告见 `.workbuddy/review/AUDIT-2026-10-20.md`（904 行），
> 修复前取证 `.workbuddy/review/REPRO-2026-10-20.md`，修复后复验 `.workbuddy/review/VERIFY-2026-10-20.md`。
> 编号沿用审查报告的 `NEW-xx`（不复用历史 #号）。

| # | 类别 | 严重度 | 问题 | 影响范围 | 修复方案 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| — | — | — | **暂无**（本轮 24 条已全部闭环：13 条高危/中危 + 9 条中低危已修复并实机验证，2 条经实机证伪转入「已确认-不修」区） | — | — | — |

| # | 类别 | 严重度 | 问题 | 影响范围 | 修复方案 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 下游漂移 | 缺失 | 中 | **跨仓库的 kit vendor 副本仍是旧版，不含本轮任何修复**（全部为 v2.3.0 / v2.4.0 中间版本，新增符号 `ALLOWED_ATTRS` / `normalizeInputType` / `sanitizeIdPart` / `normalizeProgressValue` 命中数为 **0**）：① 宿主 `third-party/novel-stream/ui-kit/`（v2.3.0，md5 `5a5a4b2d9344`）② `Plugins/novel-stream/ui-kit/`（v2.3.0，`5a5a4b2d9344`）③ `Plugins/ST-WebDAV/ui-kit/`（v2.4.0，`d786f1cd948d`）④ `Plugins/ST-WebDAV/src/client/vendor/ui-kit/`（v2.4.0，`692190fc4833`） | 这些副本所在插件仍在使用：吐司层关闭后不重开（NEW-24）、`el()` 无属性白名单（NEW-01）、input type 塌缩（NEW-05）、非法 focusFallback 抛错（NEW-03）、tab key 不校验（NEW-02）、progress 的 aria 与 width 不一致（NEW-04）等**全部 13 项已修缺陷** | **本轮不擅自改动他人插件**（均在 ui-kit 仓库范围之外，改动需各插件作者确认）。ui-kit 仓库内的防漂移断言只覆盖**仓库内四文件**，无法覆盖跨仓库副本 | 待修复（需各下游插件同步） |
| 下游漂移 | 缺失 | 低 | 宿主与工作区内共 **6 份** kit 副本版本不一：定版 `3fd4e96c`（ui-kit 根目录 / `st-extension-template/ui-kit/` / 宿主 `nvui-kit-lab` / 宿主 `my-plugin-template`）vs 上述 4 份旧版 | 跨插件的 kit 版本碎片化，宿主内同一组件行为不一致（同一页面里不同插件的浮层/吐司行为可能不同） | 由各插件作者决定同步节奏；ui-kit 仓库已加**仓库内四文件** md5 防漂移断言 | 待修复（需各下游插件同步） |

---

## 修复中

| # | 类别 | 严重度 | 问题 | 影响范围 | 修复方案 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| — | — | — | **暂无**（本轮 ui-kit 仓库内的 13 条高危/中危 + 9 条中低危已全部修复并实机验证；仅剩 2 条**跨仓库**的下游副本漂移待各插件作者同步） | — | — | — |

---

## 已验证

> 判定标准：**必须在真实 SillyTavern 宿主（`http://127.0.0.1:8000`，v1.19.0）里跑过**，
> 且同时覆盖**正常路径**与**异常输入**；静态阅读不算数。
> 复现脚本 `test/st-review-repro.js`（修复前 11 PASS / 18 FAIL → 修复后全绿）、
> 复验脚本 `test/st-review-verify.js`（62 条断言）、harness `test/st-review-harness.js`。

| # | 类别 | 严重度 | 问题 | 影响范围 | 修复方案 | 验证结果 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NEW-24 | 缺失 | **高** | `showToast()` 的吐司层被最后一条吐司的 `dismiss()` 关闭并 `hidden=true` 后，`ensureToastLayer()` 命中已有层**直接 return、不再 `show()`** → **页面生命周期内只有第一条吐司可见，之后所有吐司彻底不可见**（实测 `rectW:0 rectH:0 offsetParentNull:true opacity:0`，命中栈里根本没有吐司元素） | **全局功能失效**。任何插件的「保存成功 / 操作失败」提示，只要出现过一条会自己消失的吐司，之后**全部静默丢失**，用户侧表现是「点了按钮什么都没发生」。触发门槛极低（默认 duration 3200ms 即触发） | `ensureToastLayer` 命中已有层时若 `!layer.open` 则重新 `show()` 并 `layer.hidden=false`；`dismiss` 的 `done()` 里**不再关闭承载层**，只清空 stack | 已验证：连续 4 条吐司逐条实测宽高 > 0、opacity > 0、**命中栈可命中吐司元素**；duration=0 与 duration=3000 混合场景亦通过 |
| NEW-03 | 安全 | **高** | `opts.focusFallback` 字符串被直接喂给 `document.querySelector` → 非法选择器（如 `'#a['`）抛**未捕获** `SyntaxError`，打断焦点归还链：`opts.onClose` 未被调用、焦点掉到 BODY | 键盘用户彻底失去焦点位置；调用方 try/catch **抓不到**（异步未捕获） | 三级解析：纯 `#id` 走 `getElementById`（零注入面）→ 其余选择器先做字符白名单校验 → `querySelector` 包 try/catch 静默降级为 null | 已验证：非法选择器下 **pageerror=0**、`onClose` 被调用、焦点有落点（走完三级兜底到面板容器，**不落 BODY**）；正常选择器 `'#extensionsMenuButton'` 仍正常工作 |
| NEW-02 | 安全 | **高** | `tabs[].key` 未校验即拼进 DOM `id`（`id + '-tab-' + key`）→ 含空格/`<`/`"` 产生非法 id、重复 key 使 `panes` 覆盖导致**面板静默丢失 + 两个 tab 同时 active**、ARIA IDREF 断链 | 下游插件用用户数据当 tab key 时可致面板不可达、ARIA 关联失效 | `sanitizeIdPart()` 折算为 `[A-Za-z0-9_-]`；重复 key 追加序号去重；对外仍使用**调用方原始 key**（`setTab`/`addNode` 契约不变），内部另建 domKey | 已验证：含空格 / 含 `<>` 的 key 生成合法 id 且 ARIA 链完整；**重复 key 的两个 tab 各自独立可激活、同时只能激活一个**；`setTab(原始key)` 与 `addNode(原始key)` 均正确落到目标 pane |
| NEW-04 | 缺失 | **高** | `progress()` 初始路径的 `aria-valuenow` 取 `String(opts.value \|\| 0)`，而 width 只在 `typeof value === 'number'` 时才写 → 传 `'80'`（字符串）→ aria=80 但 width=0%；传 `200` → aria=**200 超出 aria-valuemax=100** | 无障碍读屏播报错误的进度值；与视觉宽度不一致且**无自愈路径** | `normalizeProgressValue()` 统一归一化（钳制 [0,100]、非有限值归零），初始路径与 `setValue` 共用同一结果 | 已验证：`'80'` / `200` / `NaN` 三种异常输入下 aria-valuenow 与 width **始终一致**；合法值 50 与 `setValue(50)` 行为不变 |
| NEW-05 | 缺失 | **高** | `inputRow()` 的 `input.type` 只认 `'number'`，**其余 10 种请求类型里有 8 种被静默改写为 text**（`file`/`color`/`date` 的文件选择器/取色器/日期选择器直接消失）；number 的 `onChange` 也回传字符串 | 用户可感知的功能消失 | `INPUT_TYPES` 白名单（14 种原生类型）+ `'path'` 伪类型；number 的 `onChange` 回传数字 | 已验证：`file`/`color`/`date`/`email`/`url`/`tel`/`search` 均为**真实 DOM type**；number 的 onChange 实参为 number；`'path'` 保持 DOM `type="text"` + `.is-path`（与 `preview.html:1713` 手写 DOM 一致），意图由 `data-nvui-type` 承载 |
| NEW-01 | 安全 | 高→中 | `el()` 的 `setAttribute` 通道无属性名白名单，`onclick`/`onerror`/`style`/`srcdoc`/`href` 可被注入（ISSUES #1 删除 `html` 通道后的**同类残留**） | **实机证实当前不可达**：43 次调用、12 种属性名全为 kit 内部字面量，危险属性名 0 种，恶意 title 未触发 XSS。作为**纵深防御**修复 | `ALLOWED_ATTRS` 白名单 + `on*` 前缀 / `style` / `srcdoc` / `formaction` 直接丢弃；`aria-*` / `data-*` 放行 | 已验证：危险属性全部被拦并记 warn；**合法属性未误伤**（aria-*/data-*/id/role/type/hidden/tabindex/title/for/value 等全部正常生效） |
| NEW-06 | 性能 | 高→中 | `closeLayer()` 每次关闭都 `on(overlayEl,'animationend', onAnimEnd)` **叠加监听器且从不移除** → 面板反复开合时监听器线性增长、无上界 | 内存/性能（非功能失效：`onClose` 调用数实测严格 1:1，无重复调用） | `finish()` 内 `removeEventListener` 摘除退场监听 | 已验证：开合 30 轮后 `animationend` 监听器数量**保持恒定**（修复前 30 轮 = 30 个，线性增长） |
| NEW-07 | 性能 | 中→低 | `installHostModalWatcher` 的 `MutationObserver` 装在 `documentElement` 且 `subtree:true` + `attributes:true` + `attributeFilter:['open']` → 宿主**任何元素的 open 属性变化**都触发两次全文档查询。实测触发源是宿主的 **10 个 `<details>`**（展开一个 details 即触发 1 次），单次成本 0.17ms（亚毫秒，非卡顿） | 冗余开销，随宿主规模线性放大 | 观察面收窄为「逐个 `<dialog>` 元素的 open 属性」+ 仅 `childList` 的轻量 dialog 发现器 | 已验证：展开宿主 `<details>` **不再触发**同步；宿主真实 `dialog.showModal()` **仍正确触发**降级、关闭后还原 |
| NEW-14 | 缺失 | 中 | `iconNode()` 传入非字符串对象时**直接返回该对象**当 DOM 节点 → `appendChild` 收到非 Node 抛 `TypeError` → 整个面板创建失败且无 try/catch | 传错参数即整个面板建不出来 | 非字符串时校验 `instanceof Node`（或 duck-typing `nodeType`），否则 warn 后返回 null | 已验证：传对象不再抛错，面板正常创建并给出 warn |
| NEW-17 | 缺失 | 中 | `closeLayer` 兜底时长 260ms **硬编码**，与 CSS 的 `--nvui-duration-base` 可能不一致 | 令牌被宿主改写时退场兜底时长失配 | `animationFallbackMs()` 从 `--nvui-duration-base` 派生（+60ms 余量），读不到时退回 260ms | 已验证：兜底时长随令牌变化且默认行为不变 |
| NEW-19 | 缺失 | 低 | 全文**零 `console.*` 输出**、无统一调试开关 → 运行时异常对使用者完全静默，排障只能翻源码 | 可观测性缺失 | 新增 `NVUI.config = { debug: false, logger: console }`；`logAt()` 三级分级：**debug 仅开关打开时输出，warn / error 始终输出**（异常路径绝不静默） | 已验证：debug 关闭时安静、开启时有诊断日志；warn/error 不受 debug 开关影响 |
| 副本漂移 | 缺失 | 中 | `st-extension-template/ui-kit/tokens.json` 与根目录**版本落后两版**（`2.2.0` vs `2.4.0`）且**缺失 `--nvui-z-layer`**（v2.3.0 新增的载体档令牌） | 整目录复制到下游插件后，AI/脚本从 `tokens.json` 读不到载体 z-index 档位 | 副本与根目录对齐；`test/test-ui-kit.js` 增加**四文件 md5 比对断言**，防止再次漂移 | 已验证：四方（根目录 / 模板副本 / 宿主实验室副本 / 宿主模板副本）md5 一致；npm test 通过数由 280 → 338 |
| NEW-09 | 性能 | 中 | `setTab` 每次切 tab 用 `Object.keys(panes).forEach` **全量遍历**所有 pane 并逐个 `classList.toggle` | 切换成本 O(N)，每 pane 触发样式失效 | 缓存当前激活 pane 引用，切换时只对旧/新两个 pane toggle；pane 集合改 Map | 已验证：spy 计数确认切 tab 只触碰 2 个 pane（非全量遍历） |
| NEW-10 | 性能 | 中 | `getToken()` 每次调用都执行 `getComputedStyle(host).getPropertyValue(name)`，**无缓存** | `getCarrierState()` 等高频路径持续触发样式解析 | 加 `Map` 缓存（键 = name + scope），并以**宿主样式签名**（className + 内联 style）判定失效；新增公开导出 `NVUI.invalidateTokenCache()` | 已验证：缓存命中；宿主外部改样式后签名变化 → 缓存自动失效，取值正确 |
| NEW-11 | 性能 | 低 | `preview.html` resize 监听**无节流**直接调 `syncIndicator()`（内部读 offset 触发强制布局） | 拖拽窗口时每秒触发数十次强制布局 | 改 `requestAnimationFrame` 合并为每帧至多一次（与同文件既有 `scheduleSync` 同模式） | 已验证：resize 期间 `syncIndicator` 调用次数被压到每帧至多一次 |
| NEW-12 | 性能 | 低 | `preview.html` `spawnToast` 每条吐司起独立 4.2s 定时器，`dismissToast` 不取消 | 连发 N 条 → N 个定时器同时挂起 | 定时器 id 存入闭包变量，`dismissToast` 中 `clearTimeout` | 已验证：连发后吐司全部消失、无残留定时器 |
| NEW-13 | 性能 | 低 | `components.css` 六处 `animation: ... infinite` 常驻（含 `.nvui-skeleton::after` / `.nvui-progress-bar::after`） | 批量渲染骨架屏时 N 条常驻合成层动画，无 `will-change`、无数量上限 | 给两处**纯 transform** 扫光动画补 `will-change: transform`（**未新增 `!important`**，保住 kit 的「`!important` 预算 ≤ 8」隐性契约） | 已验证：改动仅 2 行 `will-change`；`!important` 计数未增加 |
| NEW-15 | 缺失 | 中 | `opts.tabs` 空数组与未定义行为不一致；`opts.active` 可指向不存在的 key | 内容掉到 `body` 外，不进任何 pane | `active` 归一化为「tabs 中存在的第一个 key」；`addNode` 无效 key 走**四级回退链**：有效 key → 当前激活 pane → 首个 pane → body（**绝不落 body 优先**） | 已验证：无效 key 的内容**不落 body**，落在可见的激活 pane；`opts.active` 指向不存在 key 时正常回退 |
| NEW-16 | 缺失 | 中 | `destroy()` 直接 `removeChild`，**不触发 `dialog.close()`** | 宿主若依赖 dialog 的 `close` 事件做清理会漏收 | **两版修法**：① 先 `dialog.close()` 再同步摘除 —— QA 实测**无效**（`close` 事件是**异步 task** 派发，同步 `removeChild` 后元素已脱离文档树 → **不向 document 传播**，改前改后 document 级委托均为 1/5）；② **定版修法**：等 `close` 事件到达后再摘除（元素仍在文档树 → 事件可冒泡到 document），并加 `setTimeout(removeNodes, 50)` **兜底**保证载体节点不泄漏 | 已验证：**document 级委托 5/5 稳定收到** close 事件（改前 1/5）；destroy 后载体节点数归位、无泄漏；正常路径不回归（destroy 后可再 createPanel） |
| NEW-18 | 缺失 | 低 | `createPanel` 末尾 `(opts.mount \|\| document.body).appendChild(dialog)` 无兜底 | `document.body` 未就绪或 mount 无效节点时抛 `TypeError` | 三层兜底：① mount 非有效节点 → `warn` + 回退 `document.body`；② body 也不可用 → `error` + **返回 null 不抛错**；③ `appendChild` 本身抛错（宿主重写 / 节点所在文档拒绝）→ `error` + **返回 null**，**异常不穿透到调用方** | 已验证：三种情形均**不抛异常**，返回 null 且有对应级别日志（error / warn 归属正确）；mount 无效但 body 可用时仍能正常创建 |
| NEW-20 | 安全 | 中 | `el()` 的 `setAttribute` 通道**未做属性名白名单**（与 NEW-01 同源） | **实机证实不可达**：43 次调用、12 种属性名全为 kit 内部字面量，危险属性名 0 种；恶意 title 未触发 XSS | 已随 NEW-01 一并修复（白名单收敛到唯一入口），本条为同源残余 | 已验证：白名单生效，合法属性未误伤 |
| NEW-22 | 安全 | 低 | `st-extension-template/index.js` 把**插件设置的可变副本**挂到 `window.__MY_PLUGIN__` | 同宿主任意脚本可读 | `getSettings` 改为仅在 `localhost/127.0.0.1` 暴露，`open` 保留全量暴露 | 已验证：用 `--host-resolver-rules` 把 `example.com` 解析到本地构造**真实非本地宿主**场景，确认 `getSettings` 不暴露、`open` 仍可用；本机 `127.0.0.1` 下 `st-template-check.js` 读设置回写仍正常（7/7） |

---

## 已确认-不修

| # | 事项 | 说明 |
| :--- | :--- | :--- |
| - | 复用 `--nvui-z-overlay` 作为载体档 | 最初为避免「109 令牌」计数契约变动而复用 `--nvui-z-overlay`。**该方案已被推翻**：载体与子浮层混用同一档位语义不清，且 `--nvui-z-overlay` 实际比载体高一档，层级语义倒挂。最终改为新增专属 `--nvui-z-layer: 1000000`，token 总数 109 → 110，版本号按语义化规则升 **v2.3.0**（小版本，新增 token 不破坏既有取值） |
| - | 载体改用 `popover=manual` | 见 #16 实测结论：宿主模态打开时 kit 浮层本就因 `inert` 不可交互，「被压住」是模态语义的正确表现。改 `popover=manual` 会变更 DOM 契约（`<dialog class="nvui-tl">` → `<div popover="manual">`），属破坏性变更，收益不成立 |
| - | 进度条 / tabs 指示器 / 折叠面板 改用 transform 方案 | 见 #8 / #9 / #10 实测：三者均**无可感知卡顿**（帧间隔与基线一致），且替代方案要么无效（`contain` / `will-change`）、要么需破坏性改 JS 契约。维持现状 |
| - | 桌面端取消双层 `backdrop-filter` | 见 #12 实测：双层与单层帧间隔完全一致（p95 均为 16.80ms）。保留全档是 Flat Glass 设计意图，且窄屏已有降档 |
| **NEW-08**（2026-10-20 新增） | `syncTabsIndicator` 读 4 个 offset 属性造成强制同步布局 → **不改** | 实测（严格按 README §13.6 判据，看**帧间隔**而非累计布局耗时）：baseline p95 = **16.80ms** / switching p95 = **16.80ms**，**差 0.00ms**；超 16.7ms×1.5 帧预算的帧数 = **0**，长帧 = **0** → **不可感知卡顿**。与 #9（tabs 指示器）历史结论一致，改造需破坏 README §7.7 的 CSS 变量契约，收益不成立 |
| **NEW-21**（2026-10-20 新增） | `preview.html` 的 URL 参数可能构成反射型 XSS → **不成立** | 全量 grep 确认 `preview.html` **0 处** `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval`，文本一律走 `textContent`；URL 参数仅用于 `params.get(...) === 'light' / '1'` 严格白名单比较后 `classList.add`，`?toast=` 经 `TOAST_META[type] \|\| TOAST_META.info` 白名单兜底。**否定性结论** |
| **NEW-23**（2026-10-20 新增） | 路径遍历 / 敏感信息硬编码 → **不成立** | 全项目**无任何文件系统操作**（`nvui-api.js` 零 fs 调用，`preview.html` 纯前端）→ **无路径遍历面**；全仓 grep `C:\Users` / `D:\Github` / `T:\Github` **0 命中**，`api_key` / `secret` / `password` / `bearer` **0 命中**（`package.json` 的 `author: "zgy-beep"` 是公开署名）。**否定性结论** |

### 由待办转入的 5 项（附实机测量数据）

> 已在 GitHub 开 issue #3 公开这轮实测方法与数据：https://github.com/zgy-beep/ui-kit/issues/3

下表各项**曾登记为「逐帧重排 / 性能风险」**，经真实 SillyTavern 宿主实测后判定为**无需修改**。
测量方法与完整数据见 README §13.6。

| # | 原疑点 | 实测结论 | 实测数据 |
| :--- | :--- | :--- | :--- |
| 8 | 进度条 `transition: width` 逐帧触发布局重排 | **不修**：width 过渡与 transform 缩放的布局次数完全相同，width 反而略快；改 scale 需重做 shimmer 独立层 + 改宽度语义，收益为负 | A(width) = 2.0 次/动画、14.3ms；B(transform) = 2.0 次/动画、16.2ms |
| 9 | tabs 指示器 `transition: width/height` 逐帧重排 | **不修**：累计布局耗时虽高（10.5 次/切换、21.89ms），但**帧间隔与无动画基线完全一致** → 无可感知卡顿。`contain` / `will-change` 三种零契约变更手段实测收益均为 0；唯一有效的 transform 方案需破坏性改 JS 契约 | 帧间隔 p95 = 16.80ms（基线 16.80ms）、超 16.7ms 帧 35/74 vs 基线 35/73、max 17.00ms |
| 10 | 折叠面板 `transition: grid-template-rows` 逐帧重排 | **不修**：5 次展开共 16.37ms（3.27ms/次），布局次数仅 10 次；替代方案（max-height 猜测 / JS 计算高度）精度或复杂度代价更高 | 3.27ms/次、2.0 次布局/次 |
| 12 | 桌面端双层 `backdrop-filter` 开销显著 | **不修**：双层与单层与无浮层基线的帧间隔**三者完全一致**；窄屏已有降档，桌面端保留全档是 Flat Glass 设计意图 | 双层 p95 16.80ms = 单层 16.80ms = 基线 16.80ms |
| 16 | 宿主 `showModal()` 模态压住 kit 浮层 | **不修**：层级事实成立，但宿主模态已用 `inert` 禁用整页交互（kit 浮层内按钮 `focus()` 失败），「被压住」是模态语义的正确表现；关闭后立即还原。改 `popover=manual` 属破坏性 DOM 变更，收益不成立 | 命中栈顶层 = 宿主模态；`focusWorked: false`；关闭后顶层回到 `nvui-panel-body` |

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
| `test/st-perf-probe.js` | 性能总探针（#8 / #9 / #10 / #12）：CDP `Performance.getMetrics` 测布局次数 / 布局耗时 + 双层 blur 帧间隔对照 |
| `test/st-perf-tabs-fine.js` | #9 精测：分离「创建 DOM」与「纯动画」成本，三组对照（width 过渡 / 无过渡 / transform） |
| `test/st-perf-tabs-options.js` | #9 方案选型：`contain: layout` / `contain: strict` / `will-change: transform` / transform 缩放，四组对照 |
| `test/st-perf-tabs-frames.js` | #9 帧间隔判定：过渡期间 rAF 帧间隔分布 vs 无动画基线（判定是否真掉帧） |
| `test/st-modal-layer-check.js` | #16 模态层级：宿主 `showModal()` 打开时 kit 浮层是否被压住 / 是否可聚焦 / 关闭后是否还原 |
| `test/st-carrier-host-modal-check.js` | #17 载体让位机制：宿主模态下 `.is-host-modal` 是否自动增删 / 不可点 / 压暗 / `getCarrierState()` 快照 / 还原 |

### 2026-10-20 系统性 Review 新增

| 脚本 | 覆盖 |
| :--- | :--- |
| `test/st-review-harness.js` | **可复用实机脚手架**：`launch()` / `injectKit(page,{force:true})` 注入仓库版 kit / `assert()` / `summary()` / `cleanup()`；内部自动清代理并设 `NO_PROXY=*` |
| `test/st-review-harness-selftest.js` | 脚手架自身自测（15 项：注入后 `NVUI.version`、面板 open/close/destroy、CSS 注入、零 pageerror） |
| `test/st-review-host-probe.js` | 宿主环境与扩展安装状态探测（只读） |
| `test/st-review-repro.js` | **修复前复现脚本**：29 条断言，断言语义为「正确行为必须成立」→ 修复前 11 PASS / 18 FAIL，修复后 **29/29** |
| `test/st-review-verify.js` | **修复后复验脚本**：62 条断言，覆盖正常路径 + 异常输入 + 历史契约不破 → **62/62** |
| `test/st-review-diag.js` / `-n03` / `-n05` / `-n07` | 针对性诊断：焦点落点、input type 白名单、观察器收窄 |
| `test/st-review-repro-n07-detail.js` | NEW-07 观察器触发频率细测 |
| `test/st-review-legacy-preload.js` | 历史脚本预加载兼容层（应对宿主 LAB 夹具缺失） |
| `test/st-template-new22-check.js` | NEW-22 非本地宿主门禁验证（用 `--host-resolver-rules` 构造真实非本地场景） |
| `test/st-review-verify-r4.js` | 第四轮专项 27 条（含 NEW-16 destroy 摘除时机的 document 级委托验证） |
| `test/st-review-verify-r5.js` | 最终收口专项 18 条（6 轮独立循环验证 document 委托稳定性 + DOM 不泄漏 + NEW-18 两分支 + 正常路径非回归） |
| `test/st-destroy-close-check.js` | destroy → close 事件传播与兜底摘除的故障注入验证（11 条） |
| `test/st-review-provenance.js` | **版本溯源**：用 HTTP 响应体字节 md5 对比仓库 md5，证明「测的到底是不是最新版」 |

> 本轮审查报告：`.workbuddy/review/AUDIT-2026-10-20.md`（904 行）+ `AUDIT-2026-10-20-appendix.md`
> 修复前取证：`REPRO-2026-10-20.md` + `REPRO-raw-2026-10-20.json`
> 修复后复验：`VERIFY-2026-10-20.md` + `VERIFY-raw-2026-10-20.json`

运行环境：本机 SillyTavern `T:\Github\SillyTavern\APP\SillyTavern`（v1.19.0，http://127.0.0.1:8000）。
用 `playwright-core` 直连本机 Chrome（`NODE_PATH` 注入模块解析路径）。
