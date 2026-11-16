#!/usr/bin/env node
/** v2.8.x 静态功能断言：自检、默认值、间距、force 玻璃契约。版本从 package.json 派生。 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const api = require(path.join(ROOT, 'nvui-api.js'));
const css = fs.readFileSync(path.join(ROOT, 'components.css'), 'utf8');
const tokens = fs.readFileSync(path.join(ROOT, 'tokens.css'), 'utf8');
const failures = [];
const checks = [];

function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail: detail || '' });
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? '  ->  ' + detail : ''}`);
}

check(`版本 ${VERSION} 与 selfCheck/checkCompatibility/defaults 导出`,
    api.version === VERSION && typeof api.selfCheck === 'function'
    && typeof api.checkCompatibility === 'function' && !!api.defaults);
check('defaults 冻结且覆盖 7 个组件默认值', Object.isFrozen(api.defaults)
    && ['switchRow', 'inputRow', 'accordion', 'progress', 'createPanel', 'showToast', 'actions']
        .every((k) => !!api.defaults[k]));
check('checkCompatibility min/max 语义', api.checkCompatibility({ min: '2.7.0', max: '3.0.0' }).compatible
    && !api.checkCompatibility({ min: '2.9.0' }).compatible);
const nodeCheck = api.selfCheck({ expect: VERSION });
check('selfCheck 在 Node 无 DOM 安全返回 no-dom', nodeCheck.ok === false
    && nodeCheck.issues.includes('no-dom') && nodeCheck.kitVersion === VERSION);
check(`tokens.css 包含 --nvui-kit-version ${VERSION}`,
    tokens.includes('--nvui-kit-version: ' + VERSION));
check('CSS 包含 .nvui-actions 与正文相邻按钮默认间距',
    /\.nvui-actions\s*\{/.test(css)
    && /:where\([^)]*\)\s*>\s*\.nvui-btn\s*\+\s*\.nvui-btn/.test(css));
check('CSS 包含 force 玻璃作用域与 4 条 !important',
    /dialog\.nvui-tl\[data-nvui-glass="force"\]\s+\.nvui-panel/.test(css)
    && (css.replace(/\/\*[\s\S]*?\*\//g, '').match(/!important/g) || []).length === 18);
check('CSS 含面板级 solid 覆盖（dialog 自身 .nvui-solid）',
    /dialog\.nvui-tl\.nvui-solid\s+\.nvui-panel/.test(css));

if (failures.length || checks.some((c) => !c.ok)) process.exit(1);
console.log(`${VERSION} 静态功能断言通过。`);
