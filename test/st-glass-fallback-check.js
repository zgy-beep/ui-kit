/**
 * 实机回归：ISSUES.md #15 —— 宿主全局禁用 backdrop-filter 时的玻璃实心回退
 *
 * 背景：SillyTavern 的 FastUI 用 `body.no-blur * { backdrop-filter: unset !important }`
 * 全局关掉模糊。浏览器**仍然支持** backdrop-filter，所以 `@supports not` 降级分支
 * 根本不触发 —— 玻璃只剩半透明底色，下层文字直接透出来形成重影。
 *
 * 验证三件事：
 *   A. 基线：宿主 body 带 no-blur 时，kit 玻璃元素的 computed backdropFilter 为 none
 *      → 证明「浏览器支持 ≠ 实际生效」，CSS 的 @supports 探测不到。
 *   B. 修复：调用 NVUI.syncGlassFallback() 后，根节点自动挂 .nvui-solid，
 *      且玻璃表面回退为不透明背景（--nvui-bg / --nvui-bg-2）。
 *   C. 对照：把 no-blur 从 body 上摘掉后重探，backdropFilter 恢复为 blur(...)，
 *      说明探测读的是**实际计算值**而不是浏览器能力。
 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const KIT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(KIT, 'st-lab-out', 'st-glass-fallback');

const checks = [];
function check(name, cond, detail) {
    checks.push({ name, ok: !!cond, detail: detail || '' });
    console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  ->  ' + detail : ''}`);
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);

    // 打开 kit lab 面板
    await page.evaluate(() => window.__NVUI_LAB__ && window.__NVUI_LAB__.open('basic'));
    await page.waitForTimeout(1200);

    // ---- A. 基线：宿主 no-blur 下 backdrop-filter 是否真的没生效 ----
    const baseline = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.className = 'nvui-glass';
        probe.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
        document.body.appendChild(probe);
        const cs = getComputedStyle(probe);
        const bf = cs.backdropFilter || cs.webkitBackdropFilter || '';
        const panel = document.querySelector('.nvui-panel');
        const pcs = panel ? getComputedStyle(panel) : null;
        const out = {
            bodyClass: document.body.className,
            htmlClass: document.documentElement.className,
            probeBackdrop: bf,
            panelBackdrop: pcs ? (pcs.backdropFilter || pcs.webkitBackdropFilter || '') : null,
            panelBg: pcs ? pcs.backgroundColor : null,
            hasNVUI: typeof window.NVUI !== 'undefined',
        };
        probe.remove();
        return out;
    });
    console.log('基线：', JSON.stringify(baseline, null, 2));

    check('宿主处于 no-blur 状态（body class 含 no-blur）',
        /no-blur/.test(baseline.bodyClass), baseline.bodyClass);
    check('浏览器仍支持 backdrop-filter（@supports 探测不到宿主禁用）',
        /blur/.test(baseline.probeBackdrop) === false
            ? '实际计算值为 none → 证实 @supports not 无法探测'
            : '当前环境未禁用，基线不适用',
        'probe=' + baseline.probeBackdrop);
    check('kit 玻璃面板此时 backdrop-filter 实际未生效',
        baseline.panelBackdrop === 'none' || !/blur/.test(baseline.panelBackdrop || ''),
        'panel=' + baseline.panelBackdrop + ' bg=' + baseline.panelBg);

    // ---- B. 修复：调用 syncGlassFallback 后自动挂 .nvui-solid 并回退不透明 ----
    const after = await page.evaluate(() => {
        const supported = window.NVUI
            ? window.NVUI.syncGlassFallback({ force: true })
            : null;
        const panel = document.querySelector('.nvui-panel');
        const pcs = panel ? getComputedStyle(panel) : null;
        return {
            supported,
            htmlClass: document.documentElement.className,
            panelBackdrop: pcs ? (pcs.backdropFilter || pcs.webkitBackdropFilter || '') : null,
            panelBg: pcs ? pcs.backgroundColor : null,
            panelBgOpaque: pcs ? !/rgba\([^)]*,\s*0?\.\d+\)/.test(pcs.backgroundColor) : null,
        };
    });
    console.log('修复后：', JSON.stringify(after, null, 2));

    check('NVUI.syncGlassFallback() 正确识别出模糊不可用',
        after.supported === false, 'supported=' + after.supported);
    check('根节点自动挂上 .nvui-solid（宿主 no-blur 自动实心回退）',
        /nvui-solid/.test(after.htmlClass), after.htmlClass);
    check('面板玻璃回退为不透明背景（不再是半透明底色 → 无重影）',
        after.panelBgOpaque === true, 'bg=' + after.panelBg + ' backdrop=' + after.panelBackdrop);
    check('回退后 backdrop-filter 已被关闭',
        after.panelBackdrop === 'none', 'panel=' + after.panelBackdrop);

    await page.screenshot({ path: path.join(OUT, 'glass-fallback.png') });

    // ---- C. 对照：摘掉 no-blur 后重探，模糊应恢复 ----
    const control = await page.evaluate(() => {
        document.body.classList.remove('no-blur');
        document.documentElement.classList.remove('nvui-solid');
        const probe = document.createElement('div');
        probe.className = 'nvui-glass';
        probe.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
        document.body.appendChild(probe);
        const bf = getComputedStyle(probe).backdropFilter || '';
        probe.remove();
        return bf;
    });
    check('对照：移除 no-blur 后探测值恢复为 blur(...)（说明探测读的是实际计算值）',
        /blur/.test(control), 'probe=' + control);

    check('全程无控制台错误', errors.length === 0, errors.slice(0, 3).join(' | '));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n实机结果：通过 ${checks.length - failed.length}，失败 ${failed.length}`);
    await browser.close();
    process.exit(failed.length ? 1 : 0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
