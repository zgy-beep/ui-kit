# MIGRATION-v2 · v2.0 → v2.8 历史

本文件只记录**跨版本差异的要点**；当前版本升级步骤见 [UPGRADING.md](UPGRADING.md)，日常变更见 [CHANGELOG.md](CHANGELOG.md)。

| 版本 | 类型 | 下游需要做什么 |
| :--- | :--- | :--- |
| v2.0.0 | MAJOR | 按 v2 设计语言重做 DOM 结构与类名；一次性迁移 |
| v2.1.x | MINOR/PATCH | 覆盖资产；新增面板布局标准与尺寸 token |
| v2.2.0 | MINOR | 覆盖资产；宿主表单隔离、玻璃/降级修正 |
| v2.3.0 | MINOR | 覆盖资产；token 体系与文档补齐 |
| v2.4.0 | MINOR | 覆盖资产；API 增补、持久化、`form-scope` opt-in |
| v2.5.0 | MINOR | 覆盖资产；持久化布局、面板头部、720px |
| v2.6.0 | MINOR | 覆盖资产；`!important` 预算收紧、无障碍修正 |
| v2.7.0 | MINOR | 覆盖资产；组件清单与面板布局扩展 |
| v2.7.1 | PATCH | 覆盖资产；浏览器回归稳定性 |
| v2.7.2 | PATCH | 覆盖资产；玻璃透明感修复、97% Fast UI 回退、状态探测自愈 |
| v2.8.0 | MINOR | 覆盖 4 资产；新增版本 token / 自检 / defaults / `.nvui-actions` / `glass` 模式；见 UPGRADING |

## 兼容承诺

- 不删除 / 不改名 token、组件类、`is-*` 状态类、公开 API；
- 不改 DOM 必需结构；
- 状态格式 `{ version: 1, ... }` 继续可读；
- 新增能力默认关闭或保持旧行为（`glass: 'auto'` 为默认）。

## 历史升级事故提醒

- 只换 CSS、忘换 `tokens.json` / `nvui-api.js` 是最常见漂移；v2.4.0 曾发生模板 `tokens.json` 落后两版。
- 从 v2.7.2 起 `test/downstream-check.js` 可在下游直接验收 4 资产一致性。
