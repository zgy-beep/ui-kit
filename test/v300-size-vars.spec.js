/**
 * v3.0.0 / GH-#19 C1 回归：面板尺寸载体从内联 px 改为 CSS 变量
 * ---------------------------------------------------------------------------
 * 内联 width/height 是作者级声明，下游写 `height: 94vh` 永远抢不过它（#16 只是症状）。
 * v3.0 把载体换成 `--nvui-panel-w` / `--nvui-panel-h`，并给一个版本的过渡开关
 * `data-nvui-legacy-size`（仍然写内联 px + 只告警一次）。
 *
 * 设计契约（本 spec 逐条锁死）：
 *   V1  setSize() 写的是变量：--nvui-panel-w/h 有值，style.width/height 保持为空
 *   V2  同一段下游 CSS：v3 载体下生效（真实宽度 500），legacy 载体下被内联 px 压住
 *       —— 这条是 C1 的存在理由，不只是「写法变了」
 *   V3  data-nvui-legacy-size 开关：写内联 px、不写变量，且只告警一次（warnOnce）
 *   V4  迁移器：v1 存档（{width,height,isMaximized}）被读成 v2（{w,h,mode}）并落盘成 v2
 *   V5  兼容读：下游直接写 style.width，kit 仍能读到（readPanelSize 回退内联 px）
 *   V6  最大化写 calc 变量；还原时清掉 calc，主权交回 CSS 默认值
 *   V7  clearLayoutState() 同步清变量（不留残余尺寸）
 *   V8  全程 0 pageerror / 0 console error
 *
 * 运行：node test/v300-size-vars.spec.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const browserDeps = require('../scripts/resolve-browser');
const { chromium } = browserDeps.requirePlaywright();

const KIT_ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = browserDeps.requireChrome();

const PATHS = {
    tokensCss: path.join(KIT_ROOT, 'tokens.css'),
    componentsCss: path.join(KIT_ROOT, 'components.css'),
    nvuiApi: path.join(KIT_ROOT, 'nvui-api.js'),
};

function startEphemeralServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const url = req.url.split('?')[0];
            if (url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
            if (url === '/' || url === '/index.html') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NVUI v3.0.0 C1 size vars</title>
    <link rel="stylesheet" href="/tokens.css">
    <link rel="stylesheet" href="/components.css">
</head>
<body>
    <div id="host-fixture">宿主聊天区</div>
    <script src="/nvui-api.js"></script>
</body>
</html>`);
                return;
            }
            let filePath = null;
            let mimeType = 'text/plain';
            if (url === '/tokens.css') { filePath = PATHS.tokensCss; mimeType = 'text/css'; }
            else if (url === '/components.css') { filePath = PATHS.componentsCss; mimeType = 'text/css'; }
            else if (url === '/nvui-api.js') { filePath = PATHS.nvuiApi; mimeType = 'application/javascript'; }
            if (filePath && fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': mimeType + '; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
        server.listen(0, '127.0.0.1', () => {
            resolve({
                server,
                url: 'http://127.0.0.1:' + server.address().port + '/',
                close: () => new Promise((r) => server.close(r)),
            });
        });
    });
}

const results = [];
function record(id, name, pass, detail, ms) {
    results.push({ id, name, pass: !!pass, detail: detail || '' });
    const tag = pass ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(tag + ' ' + id + ': ' + name + ' \x1b[90m(' + ms + 'ms)\x1b[0m');
    if (detail) console.log('       \x1b[90m└─ ' + detail + '\x1b[0m');
}

(async () => {
    console.log('\x1b[1m\x1b[35m============================================================\x1b[0m');
    console.log('\x1b[1m\x1b[35m  v3.0.0 C1 · 尺寸载体：内联 px → CSS 变量              \x1b[0m');
    console.log('\x1b[1m\x1b[35m============================================================\x1b[0m\n');

    for (const k of ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'all_proxy']) {
        delete process.env[k];
    }
    process.env.NO_PROXY = '*';

    const sandbox = await startEphemeralServer();
    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e && e.message)));
    page.on('console', (m) => {
        if (m.type() !== 'error') return;
        if (/favicon/i.test(m.text())) return;
        consoleErrors.push(m.text());
    });

    await page.goto(sandbox.url, { waitUntil: 'domcontentloaded' });

    const ready = await page.evaluate(() => typeof window.NVUI === 'object'
        && window.NVUI !== null && typeof window.NVUI.createPanel === 'function');
    if (!ready) {
        console.error('[FATAL] NVUI 未加载');
        await browser.close();
        await sandbox.close();
        process.exit(1);
    }

    await page.evaluate(() => {
        window.__wait = (ms) => new Promise((r) => setTimeout(r, ms));
        window.__open = (opts) => {
            const p = window.NVUI.createPanel(opts);
            p.open();
            return p;
        };
        window.__w = (el) => el.style.getPropertyValue('--nvui-panel-w');
        window.__h = (el) => el.style.getPropertyValue('--nvui-panel-h');
        /* 下游接管尺寸：普通规则、无 !important、追加在 kit 样式之后 */
        window.__injectDownstream = (px) => {
            let s = document.getElementById('downstream-size');
            if (!s) {
                s = document.createElement('style');
                s.id = 'downstream-size';
                document.head.appendChild(s);
            }
            s.textContent = '.nvui-panel { width: ' + px + 'px; }';
        };
        window.__dropDownstream = () => {
            const s = document.getElementById('downstream-size');
            if (s) s.remove();
        };
        window.__warns = [];
        const origWarn = console.warn.bind(console);
        console.warn = function () {
            window.__warns.push(Array.prototype.slice.call(arguments).join(' '));
            return origWarn.apply(null, arguments);
        };
    });

    const run = async (id, name, fn) => {
        const t0 = Date.now();
        try {
            const res = await page.evaluate(fn);
            record(id, name, res && res.pass, res && res.detail, Date.now() - t0);
            return !!(res && res.pass);
        } catch (err) {
            record(id, name, false, '抛错: ' + (err && err.message), Date.now() - t0);
            return false;
        }
    };

    // ------------------------------------------------------------------ V1
    await run('V1', 'setSize() 写变量：--nvui-panel-w/h 有值，style.width/height 保持为空', () => {
        localStorage.clear();
        const p = window.__open({ id: 'v1', title: 'V1' });
        p.setSize(860, 620);
        return window.__wait(60).then(() => {
            const el = p.panel;
            const out = {
                pass: window.__w(el) === '860px'
                    && window.__h(el) === '620px'
                    && el.style.width === ''
                    && el.style.height === '',
                detail: JSON.stringify({
                    varW: window.__w(el), varH: window.__h(el),
                    inlineW: el.style.width, inlineH: el.style.height,
                }),
            };
            p.destroy();
            return out;
        });
    });

    // ------------------------------------------------------------------ V2
    await run('V2', '同一段下游 CSS：v3 载体下生效（500），legacy 载体下被内联 px 压住（860）', () => {
        localStorage.clear();
        window.__injectDownstream(500);
        const p = window.__open({ id: 'v2', title: 'V2' });
        p.setSize(860, 620);
        return window.__wait(60).then(() => {
            const modern = Math.round(p.panel.getBoundingClientRect().width);
            p.destroy();
            return window.__wait(120).then(() => {
                document.documentElement.setAttribute('data-nvui-legacy-size', '');
                const q = window.__open({ id: 'v2b', title: 'V2 legacy' });
                q.setSize(860, 620);
                return window.__wait(60).then(() => {
                    const legacy = Math.round(q.panel.getBoundingClientRect().width);
                    const legacyInline = q.panel.style.width;
                    q.destroy();
                    document.documentElement.removeAttribute('data-nvui-legacy-size');
                    window.__dropDownstream();
                    return {
                        /* v3：下游 500 生效；legacy：内联 860 压过下游 → 860。
                           两者都必须成立，否则说明载体根本没换或开关没生效。 */
                        pass: modern === 500 && legacy === 860 && legacyInline === '860px',
                        detail: JSON.stringify({ modernWidth: modern, legacyWidth: legacy, legacyInline }),
                    };
                });
            });
        });
    });

    // ------------------------------------------------------------------ V3
    await run('V3', 'legacy 开关：写内联 px、不写变量，且只告警一次（warnOnce）', () => {
        localStorage.clear();
        /* 不重置 __warns：V2 的 legacy 分支已经触发过一次，这里再写两次仍应只有那一条 ——
           这正是 warnOnce 的语义（按 key 去重，不是按调用次数）。 */
        document.documentElement.setAttribute('data-nvui-legacy-size', '');
        const p = window.__open({ id: 'v3', title: 'V3' });
        p.setSize(700, 500);
        return window.__wait(60).then(() => {
            p.setSize(760, 520);
            return window.__wait(60).then(() => {
                const el = p.panel;
                const hits = window.__warns.filter((w) => w.indexOf('data-nvui-legacy-size') !== -1).length;
                const out = {
                    pass: el.style.width === '760px'
                        && el.style.height === '520px'
                        && window.__w(el) === ''
                        && window.__h(el) === ''
                        && hits === 1,
                    detail: JSON.stringify({
                        inlineW: el.style.width, inlineH: el.style.height,
                        varW: window.__w(el), varH: window.__h(el), legacyWarns: hits,
                    }),
                };
                p.destroy();
                document.documentElement.removeAttribute('data-nvui-legacy-size');
                return out;
            });
        });
    });

    // ------------------------------------------------------------------ V4
    await run('V4', '迁移器：v1 存档读成 v2（w/h/mode）并落盘成 v2', () => {
        localStorage.clear();
        localStorage.setItem('nvui_state_v4', JSON.stringify({
            version: 1,
            timestamp: 12345,
            size: { width: 820, height: 540, isMaximized: false },
            tab: 'one',
            accordion: { a: true },
        }));
        const p = window.__open({
            id: 'v4', title: 'V4', persist: true,
            tabs: [{ key: 'one', label: 'One' }, { key: 'two', label: 'Two' }],
        });
        return window.__wait(120).then(() => {
            const live = p.getLayoutState();
            const rectH = Math.round(p.panel.getBoundingClientRect().height);
            p.flushPersistSave(true);
            return window.__wait(120).then(() => {
                const saved = JSON.parse(localStorage.getItem('nvui_state_v4') || 'null');
                const out = {
                    pass: !!saved
                        && saved.version === 2
                        && !!saved.size && saved.size.w === 820 && saved.size.h === 540
                        && saved.size.mode === 'normal'
                        && live.version === 2 && live.size.w === 820
                        && rectH === 540,
                    detail: JSON.stringify({ live: live, saved: saved, rectH: rectH }),
                };
                p.destroy();
                return out;
            });
        });
    });

    // ------------------------------------------------------------------ V5
    await run('V5', '兼容读：下游直接写 style.width，kit 仍能读到并纳入状态', () => {
        localStorage.clear();
        const p = window.__open({ id: 'v5', title: 'V5', persist: true });
        p.panel.style.width = '900px';
        return window.__wait(60).then(() => {
            const st = p.getLayoutState();
            const w = st && st.size && st.size.w;
            p.panel.style.width = '';
            const out = {
                pass: w === 900,
                detail: JSON.stringify({ size: st && st.size }),
            };
            p.destroy();
            return out;
        });
    });

    // ------------------------------------------------------------------ V6
    await run('V6', '最大化写 calc 变量；还原时清掉 calc，宽度回到 CSS 默认', () => {
        localStorage.clear();
        const p = window.__open({ id: 'v6', title: 'V6' });
        p.setMaximized(true);
        return window.__wait(60).then(() => {
            const maxW = window.__w(p.panel);
            const maxRect = Math.round(p.panel.getBoundingClientRect().width);
            p.setMaximized(false);
            return window.__wait(60).then(() => {
                const afterVar = window.__w(p.panel);
                const afterRect = Math.round(p.panel.getBoundingClientRect().width);
                const out = {
                    pass: maxW === 'calc(100vw - 32px)'
                        && maxRect === window.innerWidth - 32
                        && afterVar === ''
                        && Math.abs(afterRect - 720) <= 2,
                    detail: JSON.stringify({
                        maxVar: maxW, maxWidth: maxRect, afterVar: afterVar, afterWidth: afterRect,
                    }),
                };
                p.destroy();
                return out;
            });
        });
    });

    // ------------------------------------------------------------------ V7
    await run('V7', 'clearLayoutState() 同步清变量：不留残余尺寸', () => {
        localStorage.clear();
        const p = window.__open({ id: 'v7', title: 'V7', persist: true });
        p.setSize(880, 600);
        return window.__wait(60).then(() => {
            const before = window.__w(p.panel);
            p.clearLayoutState();
            return window.__wait(60).then(() => {
                const out = {
                    pass: before === '880px' && window.__w(p.panel) === '' && window.__h(p.panel) === ''
                        && p.panel.style.width === '' && p.panel.style.height === '',
                    detail: JSON.stringify({
                        before: before, afterVarW: window.__w(p.panel), afterVarH: window.__h(p.panel),
                    }),
                };
                p.destroy();
                return out;
            });
        });
    });

    // ------------------------------------------------------------------ V8
    await new Promise((r) => setTimeout(r, 150));
    record('V8', '全程 0 pageerror / 0 console error',
        pageErrors.length === 0 && consoleErrors.length === 0,
        JSON.stringify({ pageErrors, consoleErrors }), 0);

    await browser.close();
    await sandbox.close();

    const failed = results.filter((r) => !r.pass);
    console.log('\n\x1b[1m------------------------------------------------------------\x1b[0m');
    if (failed.length) {
        console.log(`\x1b[31m  结果: ${results.length - failed.length}/${results.length} PASS\x1b[0m`);
        failed.forEach((f) => console.log('   \x1b[31mFAIL ' + f.id + ' ' + f.name + '  ' + f.detail + '\x1b[0m'));
        process.exit(1);
    }
    console.log(`\x1b[32m  结果: ${results.length}/${results.length} PASS\x1b[0m`);
    console.log('\x1b[1m------------------------------------------------------------\x1b[0m');
})().catch((err) => {
    console.error('[FATAL] ' + (err && err.stack || err));
    process.exit(1);
});
