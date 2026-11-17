'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const browserDeps = require('../scripts/resolve-browser');
const { chromium } = browserDeps.requirePlaywright();

async function main() {
    const browser = await chromium.launch({ executablePath: browserDeps.requireChrome() });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        if (process.argv.includes('--host')) {
            await page.goto(process.env.NVUI_HOST_URL || 'http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(9000);
        } else {
            await page.setContent('<!doctype html><html><body></body></html>');
        }
        const root = path.join(__dirname, '..');
        for (const file of ['tokens.css', 'components.css']) await page.addStyleTag({ path: path.join(root, file) });
        await page.addScriptTag({ path: path.join(root, 'nvui-api.js') });
        await page.evaluate(() => {
            for (const id of ['opener', 'other']) {
                const button = document.createElement('button');
                button.id = id;
                button.textContent = id;
                button.style.cssText = 'position:fixed;top:12px;left:12px;z-index:2147483646';
                document.body.prepend(button);
            }
            window.fixture = (opts) => NVUI.createPanel({
                tabs: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }],
                width: 720, ...opts,
            });
            window.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            window.closePanel = async (panel) => {
                panel.close();
                const deadline = performance.now() + 1000;
                while (panel.dialog.open && performance.now() < deadline) await delay(20);
                if (panel.dialog.open) throw new Error('Panel did not close');
            };
        });

        const navigation = await page.evaluate(() => {
            const panel = fixture({ id: '-1' });
            panel.open();
            const tab = panel.tabs.querySelector('[role=tab]');
            tab.focus();
            tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
            const after = [panel.activeTab, document.activeElement.id];
            panel.destroy();
            return after;
        });
        assert.deepEqual(navigation, ['b', '-1-tab-b']);
        assert.deepEqual(pageErrors, []);
        console.log('PASS GH-27: directional navigation accepts ID -1');

        const focus = await page.evaluate(async () => {
            const panel = fixture({ id: 'audit-focus' });
            document.getElementById('opener').focus();
            panel.open();
            await delay(80);
            const inPanel = panel.panel.contains(document.activeElement);
            panel.close();
            panel.open();
            await closePanel(panel);
            const restored = document.activeElement.id;
            panel.destroy();
            return [inPanel, restored];
        });
        assert.deepEqual(focus, [true, 'opener']);
        console.log('PASS GH-28: animated reopen preserves the original focus target');

    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
