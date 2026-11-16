# test/ 索引

按「能否无宿主复跑」分类。**新增脚本前先确定它属于哪一类**，别再往根目录堆一次性探针。

## 1. 静态门禁（无需宿主 / 无需浏览器）

| 入口 | 脚本 | 说明 |
| :--- | :--- | :--- |
| `npm test` | `test-ui-kit.js` | 规范守护主体：文件结构、令牌清单、组件三方覆盖、CSS 红线、版本一致性、复杂度冻结、模板自洽 |
| `npm run test:api` | `test-api-surface.js` | 导出面冻结（27 顶层导出 + 控制器方法） |
| `npm run test:v280` | `test-v280-features.js` | v2.8.x 功能契约（selfCheck / defaults / force 玻璃） |
| `npm run verify:release` | `scripts/verify-release.js` | 发布一致性：版本自洽、模板 MD5、CDN tag、CHANGELOG / README 时间线；`--self-test` 做反向验证 |

## 2. 浏览器 spec（需 Chrome，无需 ST 宿主）

| 入口 | 脚本 |
| :--- | :--- |
| `npm run test:browser` | `test-issues-9-10-forms.js` → `test-issue-11-accordion.js` → `issue-12-optgroup-dark-theme.spec.js` → `issue-13-14-focus-escape.spec.js` |
| `npm run test:stress` | `stress-m1-persistence.js`（19，持久化/损坏数据/竞态）→ `stress-m2-header.js`（15，头部控制流） |
| `npm run test:e2e` | `test-e2e-v250.js`（58，v2.5.0 全路径） |
| `npm run test:glass` | `st-glass-transparency.js` |

## 3. 宿主实机（需真实 SillyTavern + Chrome）

**前置**：宿主在 `http://127.0.0.1:8000`（可 `NVUI_HOST_URL` 覆盖）、Chrome 可执行（`CHROME_PATH`）、
`playwright-core` 可解析（`NODE_PATH` 或本地 devDependency）。缺条件时退出码 2 并打印修复命令。

| 入口 | 脚本 | 断言数 |
| :--- | :--- | :--- |
| `npm run test:host` | `host/smoke-panel.js` + `host/smoke-deep.js` | 35 + 19 |
| `npm run test:host:panel` | `host/smoke-panel.js` | 35 |
| `npm run test:host:deep` | `host/smoke-deep.js` | 19 |

产物（截图 / result.json）默认写 `st-lab-out/host/`，已被 `.gitignore` 排除。
基线结果与覆盖范围见 `TEST_INFRA.md` §3.2。

## 4. 历史实机脚本（`st-*.js`，需宿主 lab 扩展）

根目录的 `st-live-check.js`、`st-destroy-close-check.js`、`st-glass-fallback-check.js` 等依赖宿主侧
`window.__NVUI_LAB__`（lab 扩展）。ST 1.19.0 默认不带该扩展，**这些脚本当前不可直接复跑**，
保留作为历史证据与行为参考；新增回归请写到 `host/`。

## 5. 一次性探针（归档）

`archive/2026-10/` 存放已退役的一次性探针（7 个），仅作历史证据，不纳入任何门禁。
判据与依赖改动见该目录的 `README.md`。
