# v2.7.1 修订版修复计划

> 状态：实现与验收通过，按本计划发布；关联 [GitHub #15](https://github.com/zgy-beep/ui-kit/issues/15)。版本类型：SemVer PATCH。

## 目标与证据

- v2.7.0 的表单浏览器回归在一次并行运行中出现 453/455；半选 checkbox 背景读到 `rgba(126, 99, 231, 0.75)`，横杠尚未可见。串行重跑为 455/455。
- `test/test-issues-9-10-forms.js` 设置 `indeterminate` 后固定等 250ms，随后读取有 CSS transition 的背景与 `::after` opacity。此时序能解释中间帧，但尚无组件最终样式错误的证据。

## 修复步骤

1. 在每个载体与主题场景中设置半选态后，等待计算背景色达到 `--nvui-accent`，且 `::after` opacity 达到 `1`；明确设置 3 秒超时。
2. 保留现有半选状态、背景、横杠几何、颜色及可见性断言。超时或终值错误仍让回归失败。
3. 仅将版本声明与模板内四份资产升至 2.7.1，更新变更记录、规范指南和预览版本。保留已发布 v2.7.0 的历史记录；CDN 示例统一锁定新 tag v2.7.1。

## 验收

- `npm test` 通过，版本一致性和模板四资产逐字节一致。
- `npm run test:browser` 全部通过；额外并行运行三份 forms 回归以覆盖 #15 的触发条件。
- `node test/test-e2e-reporting.js` 与 `node test/test-e2e-v250.js --no-host` 通过；真实宿主用例如未执行，明确记为 SKIP。
- `git diff --check` 无空白问题；组件 CSS 除版本文件头外无规则变化，token 值与公开 API 不变。

## 本地验收结果（2026-10-23）

- `npm test`：362/362；`npm run test:browser`：forms 455/455、accordion 18/18、#12 217/217、#13/#14 13/13。
- 三份 forms 并行回归：每份 455/455；`node test/test-e2e-reporting.js`：31/31。
- `node test/test-e2e-v250.js --no-host`：52 PASS、0 FAIL、6 SKIP；真实宿主未执行。
- 模板四份资产 MD5 与根目录一致；`git diff --check` 通过。代码差异仅涉及测试等待逻辑及版本声明。

## 发布

提交补丁（提交信息关联 `Fixes #15`），创建附注 `v2.7.1` tag 并推送，创建含缺陷、兼容性及验收数据的 GitHub Release；确认 GitHub #15 随发布关闭。
