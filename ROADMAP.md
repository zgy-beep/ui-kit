# ui-kit 线路图（Roadmap）

本文件是三条版本的**唯一汇总视图**，与 GitHub Issue 一一对应。issue 里的任务清单是执行细节，本文件只记「线路目标 / 当前状态 / 阻塞项」。

- 线路 A → [#17](https://github.com/zgy-beep/ui-kit/issues/17) v2.8.2 工程化收尾
- 线路 B → [#18](https://github.com/zgy-beep/ui-kit/issues/18) v2.9.0 下游可维护性与可观测性
- 线路 C → [#19](https://github.com/zgy-beep/ui-kit/issues/19) v3.0.0 内联尺寸停写与命名收敛

状态取值：`未开始` / `进行中` / `部分完成` / `已完成` / `搁置`。**只有全部验收项通过才允许标 `已完成`。**

维护约定：任务状态变化时，**同时**更新 issue 勾选与本文件表格，不允许只改一边。版本发布时在本文件「已发布」区追加一行。issue 的巡查节奏与关闭判据见 [`MAINTAINING.md`](MAINTAINING.md) §3；版本三态（开发中 / 待发布 / 已发布）见 §2.1。

---

## 线路 A · v2.8.2 工程化收尾（PATCH，无行为变更）

目标：任何人 clone 下来都能复跑全部断言，门禁值得信任。

| 项 | 内容 | 状态 | 阻塞 / 证据 |
| :--- | :--- | :--- | :--- |
| A1 | 尺寸语义矩阵补齐（`issue-16-persist-size.js` T9~T12） | 未开始 | 该测试文件当前不存在，需先补建 |
| A2 | 浏览器套件免 `NODE_PATH`（`playwright-core` 进 devDependencies + `scripts/resolve-browser.js`） | 未开始 | 无 `devDependencies`、无解析脚本；本机靠外部 workspace 注入 `NODE_PATH` |
| A3 | 一键门禁 `npm run verify:all`（静态 4 项 + release + pack，检测到 Chrome 再追加浏览器段） | 未开始 | `package.json` 无该脚本；CI 直接串命令 |
| A4 | 测试目录收敛（回归 / 宿主实机 / 一次性探针分类 + `test/README.md`） | 部分完成 | 2026-11-16：宿主实机两套入库 `test/host/`（`npm run test:host`）、一次性探针归档 `test/archive/2026-10/`（7 个）、补 `test/README.md` 五类索引；`test/*.js` 50 → 43。**未做**：把剩余 13 个被文档引用的 `st-*` 与 4 个可回归脚本按 `host/` / `probe/` 彻底分目录 |
| A5 | CHANGELOG ↔ 版本一致性硬校验 | **已完成（2026-11-16）** | `scripts/verify-release.js` 已校验 `## v<version>` 条目、4 资产版本自洽、模板 MD5、CDN tag；本轮补 `README §11.4 版本时间线必须含当前版本行`，并加 `--self-test` 反向验证（3/3）。实测把版本号改成 9.9.9 后 6 条校验同时报红 |

---

## 线路 B · v2.9.0 下游可维护性与可观测性（MINOR，全 additive）

目标：不改 token 取值、组件类命名与 `nvui_state_v1` 格式，覆盖 4 资产即可升级。

| 项 | 内容 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| B1 | `panel.getLayoutState()` / `setLayoutState(state, { silent })` | 未开始 | 复用 v1 状态结构；`setLayoutState` 不触发 `applyLoadedState` 的 tab 恢复 |
| B2 | `NVUI.diagnostics()` | 未开始 | 返回可直贴 issue 的 JSON：版本、资产 md5、玻璃态、宿主模态数、`escapeStack` 深度、持久化键、监听器计数 |
| B3 | `persist.size: 'width-only'` | 未开始 | 布尔之上加枚举，`applyClamping()` 的 `useSavedSize` 门禁已有，改造成本低 |
| B4 | 拖拽调尺寸的键盘通道 | 未开始 | `tabindex=0` + `role="separator"` + 方向键步进（Shift 加速）+ Home 复位，统一走 `setSize()` |
| B5 | `inputRow` 补 `textarea` 与 `hint` / `error` | 未开始 | `error` 联动 `aria-invalid` + `aria-describedby` |
| B6 | `NVUI.setTheme('auto')` | 未开始 | `prefers-color-scheme` + 宿主 `.nvui-theme-light` 双信号，带 `matchMedia` 监听与 token 缓存失效 |

顺序建议：B1 → B3（共用持久化语义）→ B2 → B6 → B4 / B5。

---

## 线路 C · v3.0.0 内联尺寸停写与命名收敛（MAJOR，破坏性）

目标：内联尺寸停写 + 命名收敛。**发布前必须完成下游公告与迁移器。**

| 项 | 内容 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| C1 | 内联尺寸彻底停写 | 未开始 | 面板宽高改由 `--nvui-panel-w` / `--nvui-panel-h` 承载；状态升 v2 + `migrateStateV1toV2()` + 一版 `data-nvui-legacy-size` 兼容开关 |
| C2 | 按钮组收敛 | 未开始 | `.nvui-btn-row` / `.nvui-actions` / `*-footer` 合一，旧类 alias 一版 + `warnOnce` |
| C3 | `tokens.json` schema v2 | 未开始 | 分组 + 类型 + 描述，配 `scripts/tokens-v1-to-v2.js` |
| C4 | 兼容矩阵与硬门禁 | 未开始 | `checkCompatibility({ min })` + `package.json.engines`；README 明确 ST 1.19 / 1.20 与浏览器最低版本 |

破坏性影响：任何读 `panel.style.width/height` 的下游代码失效（含本仓库部分断言），需先补断言迁移。

---

## 已发布

| 版本 | 日期 | 主题 | 关联 |
| :--- | :--- | :--- | :--- |
| v2.8.0 | 2026-10-26 | 下游 DX + 组件默认值 + Fast UI 玻璃模式 | `012653a` |
| v2.7.2 | — | 玻璃透明感与探测时序修复 | — |
| v2.7.1 | — | forms 并行回归偶发断言修复 | #15 |

> 完整历史见 `CHANGELOG.md`；本表只记线路级别的里程碑。
