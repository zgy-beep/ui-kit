#!/usr/bin/env node
/**
 * v2.8.0 verify-release.js
 * 以 package.json.version 为唯一版本源，校验发布前必须一致的静态契约。
 * 零依赖；失败 exit 1 并逐条打印原因。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const notes = [];

function read(name) { return fs.readFileSync(path.join(ROOT, name), 'utf8'); }
function md5(file) { return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex'); }
function fail(msg) { failures.push(msg); }
function ok(msg) { notes.push(msg); }

const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '');
const semverOk = /^\d+\.\d+\.\d+$/.test(version);
if (!semverOk) fail(`package.json.version 不是合法 semver: ${version}`);
else ok(`version=${version}`);

const tokensCss = read('tokens.css');
const componentsCss = read('components.css');
const apiSrc = read('nvui-api.js');
const tokensJson = JSON.parse(read('tokens.json'));

if (!tokensCss.includes(`ui-kit v${version}`)) fail(`tokens.css 文件头不是 v${version}`);
else ok('tokens.css 文件头');
if (!componentsCss.includes(`ui-kit v${version}`)) fail(`components.css 文件头不是 v${version}`);
else ok('components.css 文件头');
if (!apiSrc.includes(`var VERSION = '${version}'`)) fail(`nvui-api.js VERSION 不是 ${version}`);
else ok('nvui-api.js VERSION');
if (tokensJson.version !== version) fail(`tokens.json version=${tokensJson.version}，期望 ${version}`);
else ok('tokens.json version');
if (!/--nvui-kit-version:\s*"?([^";\s]+)"?/.test(tokensCss)) fail('tokens.css 缺少 --nvui-kit-version');
else {
    const m = tokensCss.match(/--nvui-kit-version:\s*"?([^";\s]+)"?/);
    if (m[1] !== version) fail(`--nvui-kit-version=${m[1]}，期望 ${version}`);
    else ok('--nvui-kit-version');
}

const darkCount = Object.keys(tokensJson.dark || {}).length;
if (darkCount !== 111) fail(`tokens.json dark 令牌 ${darkCount}，期望 111`);
else ok('tokens.json dark 111');

const componentsCssClean = componentsCss.replace(/\/\*[\s\S]*?\*\//g, '');
const important = (componentsCssClean.match(/!important/g) || []).length;
if (important !== 18) fail(`components.css !important=${important}，期望 18`);
else ok('!important 18');

if (!read('README.md').includes(`版本：**v${version}**`)) fail(`README 标题版本不是 v${version}`);
else ok('README 标题版本');
if (!read('preview.html').includes(`UI Kit v${version}`)) fail(`preview.html 标题不是 v${version}`);
else ok('preview.html 标题');
if (!read('CHANGELOG.md').includes(`## v${version}`)) fail(`CHANGELOG 缺少 v${version} 条目`);
else ok('CHANGELOG 条目');

for (const doc of ['UPGRADING.md', 'MIGRATION-v2.md']) {
    if (!fs.existsSync(path.join(ROOT, doc))) fail(`缺少升级文档 ${doc}`);
    else ok(`升级文档 ${doc}`);
}

const TPL = path.join(ROOT, 'st-extension-template', 'ui-kit');
for (const name of ['tokens.css', 'components.css', 'nvui-api.js', 'tokens.json']) {
    const rootFile = path.join(ROOT, name);
    const tplFile = path.join(TPL, name);
    if (!fs.existsSync(tplFile)) { fail(`模板缺少 ${name}`); continue; }
    const rootMd5 = md5(rootFile);
    const tplMd5 = md5(tplFile);
    if (rootMd5 !== tplMd5) fail(`模板 ${name} MD5 不一致`);
    else ok(`模板 ${name} MD5`);
}

const cdnRe = new RegExp(`@v?${version.replace(/\./g, '\\.')}`, 'g');
const cdnCount = (read('README.md').match(cdnRe) || []).length;
if (cdnCount < 3) fail(`README CDN 示例未锁定 @v${version}（命中 ${cdnCount} 次）`);
else ok(`README CDN tag v${version}`);

console.log(`=== verify:release (v${version}) ===`);
notes.forEach((n) => console.log('  PASS', n));
if (failures.length) {
    failures.forEach((f) => console.error('  FAIL', f));
    process.exit(1);
}
console.log('全部通过。');
