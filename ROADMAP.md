# ROADMAP · v2.8.1 → v3.0

> 本文件是**计划详情的单一来源**；执行进度在 GitHub 追踪：
> [#17 · 线路 A（v2.8.2）](https://github.com/zgy-beep/ui-kit/issues/17) ·
> [#18 · 线路 B（v2.9.0）](https://github.com/zgy-beep/ui-kit/issues/18) ·
> [#19 · 线路 C（v3.0.0）](https://github.com/zgy-beep/ui-kit/issues/19)。
> 已发生的缺陷与修复历史仍记在 [`ISSUES.md`](ISSUES.md)，版本事实以 [`CHANGELOG.md`](CHANGELOG.md) 为准。

---

## 0. 基线（v2.8.1，2026-11-05）

规划里所有「不变」承诺都锚定在这组数字上，任何一项变动都要在 CHANGELOG 显式声明。

| 契约 | 当前值 | 允许在 v2.x 变化？ |
| :--- | :--- | :--- |
| 设计令牌 | 深色 111 / 浅色覆盖 47 | 只允许**新增**（MINOR） |
| 组件类名 | 81 | 只允许新增；改名留给 v3.0 |
| `!important` 预算 | 18（4 类） | 不允许增加 |
| 关键帧 | 16 | 只允许新增且必须被引用 |
| 顶层导出 | 27 | 只允许新增 |
| 持久化状态格式 | `nvui_state_v1` | v2.x 不动；v3.0 升 v2 + 迁移器 |
| 尺寸语义 | 内联 px + `clampPanelLayout()` | v2.x 维持；v3.0 改 CSS 变量 |
| 测试脚本 / 已接入 `npm` | 51 / 6 | 线路 A 要把「接入数」提到 51 中的可回归部分 |

**v2.8.1 出口状态**：`npm test` 367 PASS、`test:api` 27 导出、forms 455、accordion 18、optgroup 217、focus 13、issue-16 8/8；`verify:release` 通过；CI（main + tag）绿；Release 3 产物。

---

## 1. 排期总览

| 里程碑 | 追踪 | 窗口 | 出口指标 | 主要风险 |
| :--- | :--- | :--- | :--- | :--- |
| **v2.8.2** 工程化收尾 | [#17](https://github.com/zgy-beep/ui-kit/issues/17) | 2026-11-06 → 11-14 | `npm run verify:all` 一次通过；新机器 `npm i` 后浏览器套件可复跑；零行为变更 | 目录搬动（A4）会打断下游脚本路径引用 |
| **v2.9.0** 下游可维护性 | [#18](https://github.com/zgy-beep/ui-kit/issues/18) | 2026-11-15 → 12-04 | 6 项 additive 能力 + 双绿断言 + 文档与 API 表同步 | B3 枚举语义与 B1 状态读写互相影响，必须先定语义 |
| **v3.0.0** 尺寸与命名重构 | [#19](https://github.com/zgy-beep/ui-kit/issues/19) | 2026-12-05 → 2027-01-14 | 迁移器测试通过；旧类 alias 一版；`MIGRATION-v3.md` + 下游公告 | 停写内联 px 会打断读 `panel.style.*` 的下游 |

排期原则：**先让断言可信（A），再让下游少写代码（B），最后才动破坏性契约（C）**。

---

## 2. 线路 A · v2.8.2 工程化收尾（[#17](https://github.com/zgy-beep/ui-kit/issues/17)）

无行为变更，只让「测试能复跑 + 门禁值得信任」。

| # | 任务 | 动作 | 验收 | 估时 |
| :--- | :--- | :--- | :--- | :--- |
| A1 | 尺寸语义矩阵 | `test/issue-16-persist-size.js` 增 T9~T12：`{size:false,tab:false,accordion:false}` / `persist:true` / `persist:{}` / 异步 StorageAdapter | 12/12 绿；异步 adapter 下 `size:null` 落盘 | 0.5d |
| A2 | 浏览器套件免 NODE_PATH | `playwright-core` 进 `devDependencies`；新增 `scripts/resolve-browser.js`，缺包/缺 Chrome 输出**可执行修复命令** | 新机器 `npm i && npm run test:browser` 一次通过 | 0.5d |
| A3 | 一键门禁 | 新增 `scripts/verify-all.js`：静态 4 项 → `verify:release` → `pack` 产物校验 →（有 Chrome 时）浏览器段 | 本机全绿；CI 自动跳过浏览器段且不报错 | 0.5d |
| A4 | 测试目录收敛 | 按「回归 / 宿主实机 / 一次性探针」分到 `test/host/`、`test/probe/`，新增 `test/README.md` 索引；探针结论留在 `ISSUES.md` | `test/*.js` 顶层只剩可回归脚本；README §13 同步 | 1d |
| A5 | 版本一致性门禁 | `verify-release.js` 增加「CHANGELOG 首条 == `package.json.version`」「README §11.4 时间线含当前版本行」 | 故意写错版本号 → `verify:release` 必红 | 0.5d |

**出口**：`npm run verify:all` 绿 + CI 绿 + 4 资产 md5 一致 + 下游零改动（无 API / 样式 / 状态格式变化）。

---

## 3. 线路 B · v2.9.0 下游可维护性（[#18](https://github.com/zgy-beep/ui-kit/issues/18)）

MINOR，全 additive。推荐顺序：**B1 → B3（共用持久化语义）→ B2 → B6 → B4 / B5**。

| # | 能力 | 问题 | API 草案 | 验收 |
| :--- | :--- | :--- | :--- | :--- |
| B1 | 布局状态读写出入口 | 现在只有 `clearLayoutState()`，下游要「导出/导入布局」「同步到 `extension_settings`」只能反解存储结构 | `panel.getLayoutState() → state`<br>`panel.setLayoutState(state, { silent })`<br>只写内存 + 调度一次落盘，不触发 `applyLoadedState` 的 tab 恢复 | 往返幂等：`get → set → get` 深相等；`silent:true` 不写存储 |
| B3 | `persist.size: 'width-only'` | 「定宽 + 高度自适应」是高频诉求，#16 正是它的误用形态 | 布尔值保持兼容，新增 `'width-only'`；`applyClamping()` 的 `useSavedSize` 门禁按「宽/高」分别判定 | 高宽分别持久化：只回写 width、height 恒为空；`true` / `false` 行为不变 |
| B2 | `NVUI.diagnostics()` | #16 报告里最贵的一步是「确认下游装的哪版、状态里到底有什么」 | 返回可贴进 issue 的 JSON：`version / assets{md5, kitVersion} / glass / hostModals / escapeStackDepth / persistKeys / listenerCounts` | Node 无 DOM 返回 `no-dom`；浏览器返回 8 个字段；不产生副作用 |
| B6 | `NVUI.setTheme('auto')` | 下游普遍在写两套皮肤切换逻辑 | 双信号：`prefers-color-scheme` + 宿主 `.nvui-theme-light`；`matchMedia` 监听 + `invalidateTokenCache()` | 系统切深浅后 1 帧内生效；显式 `'light'/'dark'` 不受影响 |
| B4 | 键盘调尺寸 | 调尺寸只有鼠标；键盘用户用不了「记忆尺寸」 | resize 手柄 `tabindex=0` `role=separator` `aria-orientation`；方向键 ±8px（Shift ±32）、Home 复位；统一走 `setSize()` | 键盘可改宽高并落盘；焦点环可见；`prefers-reduced-motion` 下无过渡 |
| B5 | `inputRow` 补 `textarea` 与 `hint`/`error` | 14 种原生类型里没有多行文本；错误态只能自绘 | `'textarea'` 伪类型（DOM 仍 `textarea`，意图走 `data-nvui-type`）；`hint` `aria-describedby`、`error` `aria-invalid + aria-describedby` | 类型白名单断言；`error` 时 `aria-invalid="true"`；`hint`/`error` 不同时指向同一 id |

**出口**：每项「静态 + 真机」双绿 + `verify:release` 通过 + CHANGELOG 条目 + README / AI-GUIDE API 表更新 + 4 资产同步。

---

## 4. 线路 C · v3.0.0 内联尺寸停写与命名收敛（[#19](https://github.com/zgy-beep/ui-kit/issues/19)）

MAJOR。**C1 是核心**：把「kit 写内联 px」与「下游用 CSS 接管尺寸」这对根本冲突消掉 —— #16 只是它的一个症状。

### C1 迁移设计

| 项 | 现状（v2.x） | v3.0 |
| :--- | :--- | :--- |
| 尺寸载体 | `panel.style.width/height = '400px'` | `panel.style.setProperty('--nvui-panel-w', '400px')`；CSS 侧 `width: var(--nvui-panel-w, min(var(--nvui-panel-width), 100%))` |
| 钳制 | `clampPanelLayout()` 返回 `styleWidth/styleHeight` | 同一函数返回变量值；测试断言从 `style.*` 改为 `getPropertyValue('--nvui-panel-w')` |
| 状态格式 | `{ size: { width, height, isMaximized } }` | `{ version: 2, size: { w, h, mode } }` + `migrateStateV1toV2()` |
| 兼容开关 | — | 一版 `data-nvui-legacy-size`：仍写内联 px 并 `warnOnce`，v3.1 移除 |

其余：C2 三套按钮组（`.nvui-btn-row` / `.nvui-actions` / `*-footer`）合一 + 旧类 alias 一版；C3 `tokens.json` schema v2（分组 / 类型 / 描述）+ `scripts/tokens-v1-to-v2.js`；C4 兼容矩阵硬门禁（`checkCompatibility({ min })` + `engines` + README 版本矩阵）。

**出口**：迁移器测试（v1 存档 → v2 → 布局等价）、alias `warnOnce` 断言、`MIGRATION-v3.md`、下游公告模板、ST 1.19 / 1.20 实机双跑。

---

## 5. 全局完成定义（DoD）

任何版本发布前必须全部为真：

1. `npm test` / `test:api` / `test:v280` / `downstream-check` / `verify:release` 全绿；
2. 有 Chrome 的机器上 `test:browser` 全绿（含新增回归）；
3. `npm run pack` 能出 zip + `SHA256SUMS` + `manifest.json`；
4. 4 资产与 `st-extension-template/ui-kit/` md5 一致；
5. 版本十处对齐（`package.json` / `tokens.json` / `tokens.css` 文件头 + 令牌 / `components.css` / `nvui-api.js` / `preview.html` / `README` / `AI-GUIDE` / `CHANGELOG`；
6. `CHANGELOG.md` 有本版条目且写明兼容性结论；`ISSUES.md` 相关项闭环；
7. GitHub：issue 有结论、milestone 清空、tag 推送后 Release 有 3 个产物、CI 绿。

```bash
npm run verify:release && npm test && npm run test:api && npm run test:v280
npm run test:browser        # 需 Chrome + playwright-core
npm run pack
```

---

## 6. 风险登记

| 风险 | 触发信号 | 缓解 |
| :--- | :--- | :--- |
| A4 目录搬动打断下游脚本引用 | 下游/NPM 脚本里出现 `test/st-*.js` 硬编码路径 | 先在 `test/README.md` 落索引并保留一版转发 stub，下一版删除 |
| B3 枚举语义与 B1 状态读写打架 | `getLayoutState()` 返回的 `size` 在 `width-only` 下语义不明 | 先定语义：`size` 中缺省字段即「不持久化」，`get` 返回实际生效字段；B1 完成后才动 B3 |
| C1 打断读取 `panel.style.*` 的下游 | 下游报「尺寸读不到」 | `data-nvui-legacy-size` 兼容一版 + `NVUI.diagnostics()` 报出兼容开关状态 |
| 浏览器套件在 CI 上不可用 | CI 需要 Chrome | 正因如此，A3 的浏览器段必须**可跳过**，CI 只跑静态 + `pack` |
| 计划文档与实现漂移 | ROADMAP 写的与 CHANGELOG 不一致 | 每个里程碑关闭时同步更新本文件与 `ISSUES.md` |

## 7. 待拍板决策

1. **B3 命名**：`'width-only'` 还是 `'fixed-width'` / `'height:auto'`？（倾向 `'width-only'`，与 `size` 名词一致）
2. **A2 依赖策略**：`playwright-core` 进 `devDependencies` 会不会影响「零依赖」宣传口径？倾向：运行时仍零依赖，README 明确「开发期可选依赖」。
3. **C1 变量名**：`--nvui-panel-w` / `--nvui-panel-h` 还是 `--nvui-size-w` / `--nvui-size-h`？（倾向前者，与既有 `--nvui-panel-width` 同族）
4. **C4 支持下限**：v3.0 是否还承诺 SillyTavern 1.19？（若 1.20 普及，可把 1.19 降为「不保证」）

## 8. 明确不做

- 不再开「逐帧重排」性能改造轮次：#3 / #8~#12 已用帧间隔实测证伪（`test/st-perf-*.js`）。
- v2.x 内不动 DOM 必需层级与载体结构（留给 C1 / C2）。
- 不引入运行时第三方依赖；`playwright-core` 只允许是开发期依赖。
- 不提供全局 `setGlassMode` 之类的全局状态开关（`glass` 仍是面板级 opt-in）。
- 不为单个下游的布局定制新增 token（下游用 CSS 变量覆盖即可）。
