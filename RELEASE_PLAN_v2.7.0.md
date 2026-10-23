# RELEASE_PLAN_v2.7.0

> 状态：**实现完成 · Codex 本地验收通过 · 已打 v2.7.0 tag**。GitHub Release 未创建；真实宿主的 6 项用例本次未执行。
> 定版：Codex（2026-10-23）；v2.6.0 / v2.7.0 附注 tag 已补齐。

## 1. 目标与范围

**目标**：新增 opt-in `.nvui-form-scope`。自定义普通容器显式加该类后，容器内既有 `.nvui-input` 的 input / select / textarea / option 共享现有 7 条宿主表单隔离 `!important`，解决第三方主题「元素选择器 + `!important`」导致的深底深字问题。2026-10-23 追加 GitHub #12–#14 修复与回归。

**原定 opt-in 范围**（不含后续 #12–#14 追补修复）：

- 默认载体 `dialog.nvui-tl` / `.nvui-panel` 行为不变；未加 `.nvui-form-scope` 的容器行为不变。
- 只在既有 7 条隔离声明里追加同组有界选择器；不新增声明、不新增 `!important`，全文件预算仍 **14**。
- 只命中 `.nvui-input`；作用域内非 kit 控件不接管。
- 不创建定位、遮罩、模态；不引入隐式作用域或全局重置。
- token 取值不变；**公开 API / DOM 契约不变，版本号升 2.7.0**。
- 组件类总数 79 → 80。
- 文档、预览、版本声明同步到 2.7.0（2026-10-22），保留历史变更。
- **模板同步属于本轮交付**：根目录 4 资产已逐字节复制到 `st-extension-template/ui-kit/`（MD5 一致），不改模板其他文件。

**范围外**：announce API、尺寸令牌扩展、GitHub Release。

**追补修复（2026-10-23）**：#12 在两个 Kit 载体内补 `select optgroup` 主题皮肤与 `color-scheme`；#13 修正折叠内容与非首 tab 的焦点管理；#14 在宿主原生模态期间让位 Esc。根目录与模板副本保持逐字节一致。上述修复不改变公开 API、状态格式或 token 取值，但 `nvui-api.js` 不再只是版本号变更。

## 2. 三份并行职责与文件范围

| 工作流 | 职责 | 文件范围 | 当前状态 |
| :--- | :--- | :--- | :--- |
| A 文档 / 版本 | 原定阶段的版本声明与文档同步、preview 自定义容器示例、模板资产同步；打 tag 时已将 CDN 示例升级到 v2.7.0 | `RELEASE_PLAN_v2.7.0.md`、`README.md`、`AI-GUIDE.md`、`CHANGELOG.md`、`preview.html`、`package.json`、`tokens.json`、`tokens.css`、`nvui-api.js`、`ISSUES.md`、`st-extension-template/ui-kit/` 4 资产 | 已完成 |
| B 组件 / 表单测试 | `.nvui-form-scope` 的 CSS 实现与表单回归；静态门禁覆盖组件类数与三作用域选择器 | `components.css`、`test/test-issues-9-10-forms.js`、`test/test-ui-kit.js`（表单相关） | Codex 独立验证：forms 455/455，静态门禁 362/362 |
| C E2E / 宿主统计 | 当前版本 E2E 验证；宿主不可达时显式 SKIP 统计，不静默丢用例 | `test/test-e2e-v250.js`、`test/test-e2e-reporting.js` 及相关报告 | Codex 独立验证：reporting 31/31；E2E 52 PASS / 0 FAIL / 6 SKIP |

**Codex**：最终静态 / E2E 复验、冲突裁决、发布决策。

> 边界：本轮最终集成只做根目录 4 资产到模板的逐字节复制，不改模板其他文件；不撤销其它工作流的修改，不提交、不推送、不安装依赖。

## 3. 依赖顺序

1. **先实现**：B 完成 CSS 与表单测试，C 完成当前版本 E2E 与显式 SKIP 统计。
2. **再文档定稿**：A 按最终实现核对选择器、预算、类数与行为边界。
3. **最后模板同步（本轮已执行）**：根目录 `nvui-api.js` / `components.css` / `tokens.css` / `tokens.json` 复制到 `st-extension-template/ui-kit/`，MD5 逐字节一致。
4. **打 tag**：Codex 最终复验通过且用户要求后，给 v2.7.0 定版提交创建附注 tag；CDN 示例统一锁定 `v2.7.0`。

## 4. 验收矩阵

| # | 验收项 | 通过口径 | 当前状态 |
| :--- | :--- | :--- | :--- |
| 1 | 默认行为 | `.nvui-form-scope` 不改变默认载体或载体外行为；追补的 #12 仅修正默认载体内的 `optgroup` 和 `color-scheme` | Codex 复验通过 |
| 2 | opt-in 生效 | 显式加类后，容器内 `.nvui-input` 的 input / select / textarea / option 获得与默认载体相同的 7 条隔离 | Codex 复验通过 |
| 3 | 有界性 | 仅命中 `.nvui-input`；非 kit 控件不接管；作用域外不接管 | Codex 复验通过 |
| 4 | 无副作用 | `.nvui-form-scope` 不产生定位 / 遮罩 / 模态 / 全局重置 | Codex 复验通过 |
| 5 | 预算 | 全文件 `!important` 仍 14 条；无新增声明；默认载体选择器与 specificity 不变 | Codex 复验通过 |
| 6 | 契约不变 | token 取值不变；公开 API / DOM 契约不变，版本号升 2.7.0 | Codex 复验通过 |
| 7 | 统计 | 组件类 79 → 80；文档、preview、版本声明均为 2.7.0 | 已完成 |
| 8 | 浏览器回归 | forms 回归覆盖双载体 + opt-in 第三作用域、主题矩阵、hover、option、非 kit 控件、无定位 / 遮罩 / 模态 | Codex 复验 455/455，0 pageerror |
| 9 | 静态门禁 | 组件类数、三作用域选择器、精确属性值、版本一致性断言更新并通过 | Codex 复验 362 PASS / 0 FAIL；Node 无 DOM 的行为块标记 SKIP |
| 10 | E2E | 当前版本用例通过；宿主不可达的用例显式 SKIP，摘要分列 passed / failed / skipped | Codex 复验 52 PASS / 0 FAIL / 6 SKIP（--no-host） |
| 11 | 文档 / 预览 | README / AI-GUIDE 用法与界限清楚；preview 可查看 input / select / textarea；无新皮肤 | 已完成；截图检查通过 |
| 12 | CDN | 令牌、样式和运行时示例统一锁定 `v2.7.0` tag | 已完成 |
| 13 | 模板 | 根目录 4 资产同步模板并校验 MD5 | 已完成，4/4 一致 |
| 14 | 发布 | Codex 最终复验通过且用户要求后创建附注 tag；GitHub Release 单独管理 | tag 已创建，Release 未创建 |

## 5. Codex 最终独立验证证据（2026-10-22）

- `forms`：**455/455 PASS**。
- `reporting`：**31/31 PASS**。
- `preview`：桌面 1440 深色 / 手机 390 浅色截图检查，**0 pageerror**，**无横向溢出**。
- `node test/test-ui-kit.js`：**362 PASS / 0 FAIL**；Node 环境下 DOM 行为块明确跳过。
- `node test/test-issue-11-accordion.js`：**18/18 PASS**，0 pageerror / console error。
- `node test/test-e2e-v250.js --no-host`：**52 PASS / 0 FAIL / 6 SKIP**；6 条真实宿主用例因本次不访问宿主而跳过，未宣称实机全通过。
- 日志与截图：`test/out/v270-acceptance/`（本地产物，不入库）。

## 6. GitHub #12–#14 追补验收（2026-10-23）

- `node test/issue-12-optgroup-dark-theme.spec.js`：217 PASS / 0 FAIL；覆盖两套资产、两个载体、深浅主题与宿主 `!important`。Windows Chrome 原生展开弹层已截图目视复核为深底浅字，截图留在忽略目录 `test/out/issue12-native-popup.png`。
- `node test/issue-13-14-focus-escape.spec.js`：13 PASS / 0 FAIL；真实 Tab、Shift+Tab、Escape 覆盖根目录和模板副本，包括宿主 `cancel.preventDefault()` 保持打开的情形。
- `npm test`：362 PASS / 0 FAIL；`npm run test:browser` 依次运行 forms 455/455、accordion 18/18、#12 217/217、#13/#14 13/13；`node test/test-e2e-reporting.js`：31 PASS / 0 FAIL；`node test/test-e2e-v250.js --no-host`：52 PASS / 0 FAIL / 6 SKIP。
- #12–#14 的进展和验证证据已记录在对应 GitHub issue，三项均已关闭为 completed。

## 7. 后续方向

- **announce API**：暂缓，不在 v2.7.0 范围。
- **尺寸令牌扩展**：暂缓，不在 v2.7.0 范围。
- `v2.6.0` 与 `v2.7.0` 附注 tag 已补齐；GitHub Release 尚未创建。
