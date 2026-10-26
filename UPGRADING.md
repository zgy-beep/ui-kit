# UPGRADING · v2.8.0

本文件是**常青升级指南**：当前版本是 v2.8.0。历史大版本差异见 [MIGRATION-v2.md](MIGRATION-v2.md)。

## 2.7.2 → 2.8.0

v2.8.0 是 **MINOR（additive）**：没有删除/改名 token、组件类或公开 API；主要新增「版本可观测、自检、默认值、Fast UI 玻璃模式」与发布工具。

### 1. 覆盖 4 个运行资产

```
tokens.css
components.css
nvui-api.js
tokens.json
```

保持 `tokens.css` 在 `components.css` 之前，CSS 先于 JS。**4 个必须同一版本**：v2.8.0 新增 `--nvui-kit-version`、`.nvui-actions` 与 `glass` 控制器方法；只换 CSS 会缺 API，只换 JS 会缺样式。

### 2. 版本自检

```js
const r = NVUI.selfCheck({ expect: '2.8.0' });
if (!r.ok) console.warn('[my-plugin] ui-kit', r.issues);
```

- `r.cssLoaded`：tokens.css 是否加载；
- `r.glass.state` / `r.glass.autoFallback`：玻璃能力与自动回退；
- `r.issues`：版本不匹配、CSS 未加载、自动回退等。

### 3. 下游一条命令

把 `test/downstream-check.js` 随 4 资产一起拷入（例如 `ui-kit/test/`），运行：

```bash
node ui-kit/test/downstream-check.js
# exit 0 = 升级通过
```

它只依赖 4 资产 + package.json，不读 README/CHANGELOG/AUDIT。

### 4. 新增默认值/间距

- 正文内裸相邻 `.nvui-btn` 默认 8px；
- 新增 `.nvui-actions` 按钮组容器；
- `.nvui-btn-row` / `.nvui-panel-footer` / `.nvui-modal-footer` 内不会双倍间距；
- `NVUI.defaults` 可读各组件官方默认值；缺 label/title/message 会 `warnOnce`。

如果旧布局依赖「按钮贴紧」，用普通类覆盖 `margin-inline-start` 即可（新规则是零 specificity 的 `:where()`）。

### 5. Fast UI 玻璃模式（可选）

```js
const panel = NVUI.createPanel({ glass: 'auto' }); // 默认，尊重宿主
panel.setGlassMode('force');  // 仅本面板；Fast UI 开启时也强制真玻璃
panel.getGlassState();
// { mode, effective, fastUI, browserSupports, preferenceBlocked, reason }
```

- `force` 默认关闭，必须插件显式开启，并在插件设置里给用户关闭项；
- `prefers-reduced-transparency: reduce` / `forced-colors: active` / 浏览器不支持时自动回退；
- 只影响本面板，不提供全局 `NVUI.setGlassMode`；
- 旧版 Safari 的 `force` 玻璃不保证（只使用标准 `backdrop-filter`）。

### 6. 验收清单

1. 4 资产同版本；`NVUI.version === '2.8.0'`；
2. `NVUI.selfCheck({ expect: '2.8.0' })` 无 `version-mismatch` / `css-not-loaded`；
3. `node ui-kit/test/downstream-check.js` exit 0；
4. 面板/弹窗/吐司/折叠/表单冒烟，零 pageerror；
5. 检查相邻按钮间距、`.nvui-actions`、玻璃 auto/force/solid 三态；
6. 记录 `glass` 设置项与性能提示。
