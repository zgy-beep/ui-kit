/**
 * SillyTavern NVUI Kit · 可选运行时 API（零依赖）
 * ------------------------------------------------------------------
 * 版本：ui-kit v2.2.0（与 package.json / tokens.css / components.css 版本号保持一致）
 * 用途：给插件/其它软件一个「可调用的设计接口」——用函数创建符合本 Kit 规范的面板、
 *       标签页、折叠分组、开关行、输入行、进度条、吐司，自动带上布局标准、无障碍属性、
 *       动效降级与焦点管理，避免每个插件各写一套 DOM。
 *
 * 设计约束（本文件由 test/test-ui-kit.js 守护）：
 *   1. 零依赖、无网络请求、无 emoji；不 import 任何框架。
 *   2. 加载时不访问 DOM（在 Node 里 require 只拿到 API 对象），所有 DOM 操作都在函数调用时发生。
 *   3. 只使用 nvui- 前缀类名与 CSS 变量 token，绝不硬编码颜色。
 *   4. 生成的 DOM 必须与 README 的「面板布局标准」「无障碍契约」一致：
 *      dialog.nvui-tl > .nvui-overlay.is-panel > .nvui-panel（role=dialog / aria-modal / aria-labelledby），
 *      顶部 tabs 与手机底部导航共享状态，Esc / 点遮罩关闭，关闭后焦点归还触发元素。
 *   5. 默认尊重 prefers-reduced-motion / prefers-reduced-transparency（交给 CSS 门禁）；
 *      本 API 只负责切换类名与属性。
 *
 * 用法（浏览器，插件内）：
 *   <script src="./ui-kit/nvui-api.js"></script>
 *   const panel = NVUI.createPanel({
 *       id: 'my_plugin_panel',
 *       title: '我的插件设置',
 *       version: 'v1.0.0',
 *       tabs: [
 *           { key: 'basic', label: '基本设置', icon: 'fa-solid fa-sliders' },
 *           { key: 'advanced', label: '高级', icon: 'fa-solid fa-wrench' }
 *       ],
 *       actions: [{ icon: 'fa-solid fa-wand-magic-sparkles', label: '更多', onClick: function () {} }],
 *       footer: [{ label: '取消', variant: 'ghost', onClick: function () { panel.close(); } }]
 *   });
 *   panel.addSwitch('basic', { label: '启用功能', value: true, onChange: function (v) {} });
 *   panel.addAccordion('basic', {
 *       title: '基本设置', summary: '默认值',
 *       content: [panel.addInput('basic', { label: '上限 (MB)', type: 'number', value: 80 })]
 *   });
 *   panel.open();
 *
 * 用法（Node 侧做规范测试/静态生成时）：
 *   const NVUI = require('./nvui-api.js');
 *   NVUI.version; NVUI.PANEL_CLASS; NVUI.createPanel; // 只检查导出，不触发 DOM
 */
(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.NVUI = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
    'use strict';

    var VERSION = '2.3.0';
    var PANEL_CLASS = 'nvui-panel';
    var TOAST_LAYER_ID = 'nvui-api-toast-layer';

    /* ----------------------------- 工具 ----------------------------- */

    function isDomAvailable() {
        return typeof document !== 'undefined' && !!document.createElement;
    }

    function el(tag, className, attrs) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (attrs) {
            Object.keys(attrs).forEach(function (k) {
                var v = attrs[k];
                if (v === null || v === undefined) return;
                /* 只允许 textContent 通道：绝不接受原始 HTML 片段，
                   避免调用方把用户输入塞进属性时形成 XSS 缺口。 */
                if (k === 'text') node.textContent = String(v);
                else node.setAttribute(k, String(v));
            });
        }
        return node;
    }

    /** 生成一个在文档内唯一的元素 id（仅在冲突时加后缀，保持 base 可预测）
     *  面板会用 base 派生出 -layer / -overlay / -title / -tab-* / -pane-* 等多个 id，
     *  所以冲突检测必须按「派生子 id」判断，而不是只看裸 base。 */
    var idSeq = 0;
    function idTaken(base) {
        if (typeof document === 'undefined') return false;
        return !!(document.getElementById(base)
            || document.getElementById(base + '-layer')
            || document.getElementById(base + '-overlay')
            || document.getElementById(base + '-title'));
    }
    function uniqueId(base) {
        if (!idTaken(base)) return base;
        idSeq += 1;
        var candidate = base + '-' + idSeq.toString(36);
        while (idTaken(candidate)) {
            idSeq += 1;
            candidate = base + '-' + idSeq.toString(36);
        }
        return candidate;
    }

    function append(parent, children) {
        (Array.isArray(children) ? children : [children]).forEach(function (c) {
            if (!c) return;
            parent.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return parent;
    }

    function iconNode(iconClass) {
        if (!iconClass) return null;
        if (typeof iconClass !== 'string') return iconClass;
        return el('i', iconClass, { 'aria-hidden': 'true' });
    }

    function on(target, type, handler, options) {
        target.addEventListener(type, handler, options || false);
        return handler;
    }

    function q(sel, scope) {
        return (scope || document).querySelector(sel);
    }

    /** 元素当前是否可聚焦（可见 + 未 disabled + 在文档中） */
    function isFocusable(node) {
        if (!node || !node.isConnected) return false;
        if (node.disabled) return false;
        var cs = window.getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return true;
    }

    /** 读取当前作用域里的设计令牌（CSS 自定义属性） */
    function getToken(name, scope) {
        if (!isDomAvailable()) return '';
        var host = scope || document.documentElement;
        return getComputedStyle(host).getPropertyValue(name).trim();
    }

    /** 主题/实心切换：仅切类名，不写死任何颜色 */
    function setTheme(theme, options) {
        var host = (options && options.host) || document.body;
        if (!host) return;
        host.classList.remove('nvui-theme-light');
        host.classList.remove('nvui-solid');
        if (theme === 'light') host.classList.add('nvui-theme-light');
        if (options && options.solid) host.classList.add('nvui-solid');
    }

    /* ---------------------- 玻璃能力探测 ---------------------- */
    /*
     * v2.2.0 修订补丁（ISSUES.md #15）：部分宿主（如 SillyTavern 的 FastUI）
     * 会用 `body.no-blur * { backdrop-filter: unset !important }` 全局关掉模糊。
     *
     * 为什么 CSS 探测不出来：
     *   `@supports not (backdrop-filter: blur(1px))` 问的是「**浏览器**是否支持
     *   backdrop-filter」。宿主把属性 unset 之后浏览器**仍然支持**，所以
     *   `@supports` 的降级分支根本不触发 —— 结果是玻璃只剩半透明底色，
     *   下层文字直接透出来，形成重影。
     *
     * 做法：不猜宿主类名（避免与宿主耦合），而是**探测渲染后的实际计算值**：
     *   造一个带 `.nvui-glass` 的隐藏探针挂到 body，读它的 computed
     *   `backdropFilter`；若为 `none` 说明模糊已被外部禁用。
     * 命中即给根节点挂 `.nvui-solid`，kit 全部玻璃回退为不透明表面。
     */
    var glassSupportCache = null;

    function detectGlassSupport(options) {
        if (!isDomAvailable() || !document.body) return true;
        if (glassSupportCache !== null && !(options && options.force)) return glassSupportCache;
        var probe = document.createElement('div');
        probe.className = 'nvui-glass';
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:0;';
        document.body.appendChild(probe);
        var cs = window.getComputedStyle(probe);
        var bf = cs.backdropFilter || cs.webkitBackdropFilter || '';
        glassSupportCache = !(bf === 'none' || bf === '' || bf === 'unset');
        try {
            probe.parentNode.removeChild(probe);
        } catch (err) {
            /* 忽略：探针已从文档移除失败不影响结论 */
        }
        return glassSupportCache;
    }

    /**
     * 探测玻璃能力；模糊被宿主禁用时自动给根节点挂 `.nvui-solid`（实心回退）。
     * 返回 true 表示模糊可用。
     */
    function syncGlassFallback(options) {
        var supported = detectGlassSupport(options);
        if (!supported) {
            var root = (options && options.host) || document.documentElement;
            if (root) root.classList.add('nvui-solid');
        }
        return supported;
    }

    /* ---------------------- 浮层开合（top-layer 载体） ---------------------- */

    /**
     * 打开浮层：非模态 dialog.show()（避免 inert，遵守酒馆 transform 红线），
     * overlay.hidden=false 触发 CSS 进出场。
     */
    function openLayer(dialogEl, overlayEl) {
        if (!dialogEl || !overlayEl) return;
        if (dialogEl.open) {
            overlayEl.hidden = false;
            return;
        }
        try {
            dialogEl.show();
        } catch (err) {
            dialogEl.setAttribute('open', '');
        }
        overlayEl.hidden = false;
    }

    /**
     * 关闭浮层：先加 .is-closing 播放退场动画，animationend（或 260ms 兜底）后 hidden + close。
     */
    function closeLayer(dialogEl, overlayEl, done) {
        if (!dialogEl || !overlayEl) return;
        if (overlayEl.hidden || overlayEl.classList.contains('is-closing')) return;
        overlayEl.classList.add('is-closing');
        var finished = false;
        var fallback = null;
        function finish() {
            if (finished) return;
            finished = true;
            if (fallback) { clearTimeout(fallback); fallback = null; }
            overlayEl.hidden = true;
            overlayEl.classList.remove('is-closing');
            if (dialogEl.open) {
                try { dialogEl.close(); } catch (err) { dialogEl.removeAttribute('open'); }
            }
            if (typeof done === 'function') done();
        }
        function onAnimEnd(event) {
            /* animationend 会冒泡：面板内部的子动画（如 .nvui-tabpane-in）
               结束时会冒泡到 overlay，若不校验 target 会提前 finish，
               把 overlay 自身的退场动画截断。 */
            if (event && event.target !== overlayEl) return;
            finish();
        }
        on(overlayEl, 'animationend', onAnimEnd);
        fallback = setTimeout(finish, 260);
    }

    /* ---------------------- 标签指示器（粘连滑动） ---------------------- */

    function syncTabsIndicator(tabs, animate) {
        var indicator = q('.nvui-tabs-indicator', tabs);
        var active = q('.nvui-tab.is-active', tabs);
        if (!indicator || !active) return;
        var x = active.offsetLeft;
        var y = active.offsetTop;
        var w = active.offsetWidth;
        var h = active.offsetHeight;
        var had = tabs.classList.contains('is-indicator');
        var prevX = parseFloat(indicator.style.getPropertyValue('--nvui-tab-ind-x')) || 0;
        var prevW = parseFloat(indicator.style.getPropertyValue('--nvui-tab-ind-w')) || 0;
        function set(nx, ny, nw, nh) {
            indicator.style.setProperty('--nvui-tab-ind-x', nx + 'px');
            indicator.style.setProperty('--nvui-tab-ind-y', ny + 'px');
            indicator.style.setProperty('--nvui-tab-ind-w', nw + 'px');
            indicator.style.setProperty('--nvui-tab-ind-h', nh + 'px');
        }
        if (!had || !animate) {
            set(x, y, w, h);
            tabs.classList.add('is-indicator');
            return;
        }
        var left = Math.min(prevX, x);
        var right = Math.max(prevX + prevW, x + w);
        if (left === right && prevX === x) return;
        set(left, y, right - left, h);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { set(x, y, w, h); });
        });
    }

    /* ---------------------- 基础行组件 ---------------------- */

    /** 胶囊开关行：<label class="nvui-switch-row"><input type="checkbox"><span>…</span></label> */
    function switchRow(options) {
        var opts = options || {};
        var row = el('label', 'nvui-switch-row' + (opts.feature ? ' is-feature' : ''));
        var input = el('input', null, { type: 'checkbox' });
        input.checked = !!opts.value;
        if (opts.disabled) input.disabled = true;
        var text = el('span', null, { text: opts.label || '' });
        row.appendChild(input);
        row.appendChild(text);
        if (typeof opts.onChange === 'function') {
            on(input, 'change', function () { opts.onChange(input.checked); });
        }
        return row;
    }

    /** 输入行：<label class="nvui-input-row"><input class="nvui-input"><span>…</span></label> */
    function inputRow(options) {
        var opts = options || {};
        var row = el('label', 'nvui-input-row');
        var input = el('input', 'nvui-input' + (opts.type === 'number' ? ' is-number' : (opts.type === 'path' ? ' is-path' : '')));
        input.type = opts.type === 'number' ? 'number' : 'text';
        if (opts.value !== undefined) input.value = opts.value;
        if (opts.placeholder) input.placeholder = opts.placeholder;
        if (opts.min !== undefined) input.min = opts.min;
        if (opts.max !== undefined) input.max = opts.max;
        if (opts.step !== undefined) input.step = opts.step;
        if (opts.disabled) input.disabled = true;
        var text = el('span', null, { text: opts.label || '' });
        row.appendChild(input);
        row.appendChild(text);
        if (typeof opts.onChange === 'function') {
            on(input, 'change', function () { opts.onChange(input.value); });
        }
        row.input = input;
        return row;
    }

    /** 折叠分组：button.nvui-acc-head + .nvui-acc-body > .nvui-acc-inner */
    function accordion(options) {
        var opts = options || {};
        var root = el('div', 'nvui-acc' + (opts.open ? ' is-open' : ''));
        var head = el('button', 'nvui-acc-head', { type: 'button', 'aria-expanded': opts.open ? 'true' : 'false' });
        var title = el('span', 'nvui-acc-title', { text: opts.title || '' });
        var summary = el('span', 'nvui-acc-summary', { text: opts.summary || '' });
        var chev = el('i', 'nvui-acc-chev', { 'aria-hidden': 'true' });
        append(head, [title, summary, chev]);
        var body = el('div', 'nvui-acc-body');
        var inner = el('div', 'nvui-acc-inner');
        append(inner, opts.content || []);
        body.appendChild(inner);
        append(root, [head, body]);
        on(head, 'click', function () {
            var open = root.classList.toggle('is-open');
            head.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        root.head = head;
        root.inner = inner;
        root.setOpen = function (v) {
            root.classList.toggle('is-open', !!v);
            head.setAttribute('aria-expanded', v ? 'true' : 'false');
        };
        root.setSummary = function (text) { summary.textContent = text || ''; };
        return root;
    }

    /** 线性进度条：role=progressbar + .nvui-progress-bar（宽度由 API 设置） */
    function progress(options) {
        var opts = options || {};
        var track = el('div', 'nvui-progress', {
            role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(opts.value || 0),
        });
        if (opts.variant) track.classList.add('is-' + opts.variant);
        if (opts.indeterminate) track.classList.add('is-indeterminate');
        var bar = el('span', 'nvui-progress-bar');

        /* v2.2.0 修订补丁（ISSUES.md #11）：0% 与 100% 时停掉扫光动画。
         * 扫光是「进行中」的装饰，0%/100% 继续跑无限循环纯属浪费合成层资源。
         * 不确定进度永远保持扫光（它本身就表示进行中）。 */
        function syncActivity(n) {
            if (track.classList.contains('is-indeterminate')) {
                track.classList.remove('is-idle', 'is-complete');
                return;
            }
            if (n <= 0) {
                track.classList.add('is-idle');
                track.classList.remove('is-complete');
            } else if (n >= 100) {
                track.classList.add('is-complete');
                track.classList.remove('is-idle');
            } else {
                track.classList.remove('is-idle', 'is-complete');
            }
        }

        if (typeof opts.value === 'number' && !opts.indeterminate) {
            var initial = Math.max(0, Math.min(100, opts.value));
            bar.style.width = initial + '%';
            syncActivity(initial);
        }
        track.appendChild(bar);
        track.setValue = function (v) {
            var n = Math.max(0, Math.min(100, Number(v) || 0));
            bar.style.width = n + '%';
            track.setAttribute('aria-valuenow', String(n));
            syncActivity(n);
        };
        return track;
    }

    /* ---------------------- Esc 全局单例调度 ---------------------- */
    /*
     * 面板数量不定，若每个面板各自 addEventListener('keydown', …, {document})，
     * 监听器会随面板创建无限累积（且多面板时任一 Esc 会关闭全部）。
     * 这里改为：全局只挂一个 document 级监听器，维护一个「打开顺序栈」，
     * Esc 只交给栈顶（最上层）的面板；面板 destroy() 时把自己从栈里摘掉。
     */

    var escapeStack = [];
    var escapeBound = false;

    function onEscapeKey(event) {
        if (event.key !== 'Escape') return;
        for (var i = escapeStack.length - 1; i >= 0; i--) {
            var entry = escapeStack[i];
            if (!entry) continue;
            if (entry.isVisible && entry.isVisible()) {
                entry.handler(event);
                return;
            }
        }
    }

    function registerEscapeHandler(handler, isVisible) {
        if (!escapeBound) {
            document.addEventListener('keydown', onEscapeKey);
            escapeBound = true;
        }
        var entry = { handler: handler, isVisible: isVisible || function () { return true; } };
        escapeStack.push(entry);
        return entry;
    }

    function unregisterEscapeHandler(handler) {
        for (var i = escapeStack.length - 1; i >= 0; i--) {
            if (escapeStack[i] && escapeStack[i].handler === handler) {
                escapeStack.splice(i, 1);
                break;
            }
        }
        if (escapeStack.length === 0 && escapeBound) {
            document.removeEventListener('keydown', onEscapeKey);
            escapeBound = false;
        }
    }

    /* ---------------------- 面板（布局标准） ---------------------- */

    /**
     * createPanel(options) 生成完整面板并返回控制器。
     * options:
     *   id            根 id 前缀（默认 nvui-panel-<n>）
     *   title         标题（aria-labelledby 指向它）
     *   version       右上角版本徽标文字（可选）
     *   tabs          [{ key, label, icon }]；为空时无导航（单页面板）
     *   active        初始 tab key（默认第一个）
     *   actions       标题栏右侧额外图标按钮 [{ icon, label, onClick }]
     *   footer        底部按钮 [{ label, variant, onClick, close }]
     *   mount         挂载节点（默认 document.body）
     *   onClose       关闭后回调
     *   destroy       面板销毁后回调（destroy() 被调用时触发）
     */
    function createPanel(options) {
        var opts = options || {};
        var id = uniqueId(opts.id || 'nvui-panel');
        var opener = null;

        /* 宿主若全局禁用了 backdrop-filter，先做实心回退，避免玻璃只剩半透明底色 */
        syncGlassFallback();

        var dialog = el('dialog', 'nvui-tl', { id: id + '-layer', 'aria-label': (opts.title || '面板') + ' 浮层' });
        var overlay = el('div', 'nvui-overlay is-panel', { id: id + '-overlay', hidden: '' });
        var panel = el('div', 'nvui-panel', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-title' });

        /* 手机拖拽把手（纯视觉） */
        panel.appendChild(el('div', 'nvui-sheet-handle', { 'aria-hidden': 'true' }));

        /* 标题栏 */
        var header = el('div', 'nvui-panel-header');
        var title = el('b', 'nvui-panel-title', { id: id + '-title', text: opts.title || '面板' });
        if (opts.version) title.appendChild(el('span', 'nvui-badge', { text: opts.version }));
        var actions = el('span', 'nvui-panel-actions');
        (opts.actions || []).forEach(function (a) {
            var btn = el('button', 'nvui-icon-btn', { type: 'button', 'aria-label': a.label || '操作' });
            var ic = iconNode(a.icon);
            if (ic) btn.appendChild(ic);
            if (typeof a.onClick === 'function') on(btn, 'click', a.onClick);
            actions.appendChild(btn);
        });
        var closeBtn = el('button', 'nvui-icon-btn', { type: 'button', 'aria-label': '关闭面板' });
        closeBtn.appendChild(el('i', 'fa-solid fa-xmark', { 'aria-hidden': 'true' }));
        actions.appendChild(closeBtn);
        append(header, [title, actions]);
        panel.appendChild(header);

        /* 标签导航 + 内容面板 */
        var tabsNav = null;
        var bottomNav = null;
        var panes = {};
        var tabs = opts.tabs || [];
        var active = opts.active || (tabs[0] && tabs[0].key);
        if (tabs.length) {
            tabsNav = el('nav', 'nvui-tabs', { role: 'tablist', 'aria-label': '面板分区' });
            tabsNav.appendChild(el('span', 'nvui-tabs-indicator', { 'aria-hidden': 'true' }));
            tabs.forEach(function (t, index) {
                var tab = el('button', 'nvui-tab' + (t.key === active ? ' is-active' : ''), {
                    type: 'button', role: 'tab', id: id + '-tab-' + t.key,
                    'aria-selected': t.key === active ? 'true' : 'false',
                    'aria-controls': id + '-pane-' + t.key,
                    tabindex: t.key === active ? '0' : '-1',
                });
                var ic = iconNode(t.icon);
                if (ic) tab.appendChild(ic);
                tab.appendChild(document.createTextNode(t.label || t.key));
                on(tab, 'click', function () { setTab(t.key); });
                tabsNav.appendChild(tab);
            });
            panel.appendChild(tabsNav);
        }

        var body = el('div', 'nvui-panel-body');
        panes = {};
        tabs.forEach(function (t) {
            var pane = el('div', 'nvui-tabpane' + (t.key === active ? ' is-active' : ''), {
                role: 'tabpanel', id: id + '-pane-' + t.key, 'aria-labelledby': id + '-tab-' + t.key,
            });
            panes[t.key] = pane;
            body.appendChild(pane);
        });
        panel.appendChild(body);

        /* 可选底部操作区 */
        if (opts.footer && opts.footer.length) {
            var footer = el('div', 'nvui-panel-footer');
            opts.footer.forEach(function (b) {
                var btn = el('button', 'nvui-btn' + (b.variant ? ' is-' + b.variant : ''), { type: 'button', text: b.label || '' });
                on(btn, 'click', function () {
                    if (typeof b.onClick === 'function') b.onClick();
                    if (b.close) closePanel();
                });
                footer.appendChild(btn);
            });
            panel.appendChild(footer);
        }

        /* 手机底部导航（与顶部 tabs 同一份状态） */
        if (tabs.length) {
            bottomNav = el('nav', 'nvui-bottom-nav', { 'aria-label': '面板分区（手机）' });
            tabs.forEach(function (t) {
                var item = el('button', 'nvui-bottom-nav-item' + (t.key === active ? ' is-active' : ''), {
                    type: 'button', 'aria-label': t.label || t.key,
                });
                if (t.key === active) item.setAttribute('aria-current', 'page');
                var ic = iconNode(t.icon);
                if (ic) item.appendChild(ic);
                item.appendChild(el('span', null, { text: t.label || t.key }));
                on(item, 'click', function () { setTab(t.key); });
                bottomNav.appendChild(item);
            });
            panel.appendChild(bottomNav);
        }

        append(overlay, panel);
        dialog.appendChild(overlay);
        (opts.mount || document.body).appendChild(dialog);

        function setTab(key) {
            if (!panes[key]) return;
            active = key;
            if (tabsNav) {
                Array.prototype.forEach.call(tabsNav.querySelectorAll('.nvui-tab'), function (tab) {
                    var on_ = tab.id === id + '-tab-' + key;
                    tab.classList.toggle('is-active', on_);
                    tab.setAttribute('aria-selected', on_ ? 'true' : 'false');
                    tab.setAttribute('tabindex', on_ ? '0' : '-1');
                });
                syncTabsIndicator(tabsNav, true);
            }
            if (bottomNav) {
                Array.prototype.forEach.call(bottomNav.querySelectorAll('.nvui-bottom-nav-item'), function (item, index) {
                    var on_ = tabs[index] && tabs[index].key === key;
                    item.classList.toggle('is-active', on_);
                    if (on_) item.setAttribute('aria-current', 'page');
                    else item.removeAttribute('aria-current');
                });
            }
            Object.keys(panes).forEach(function (k) {
                panes[k].classList.toggle('is-active', k === key);
            });
        }

        function focusBody() {
            var target = q('.nvui-btn.is-primary', panel) || closeBtn;
            if (target && typeof target.focus === 'function') {
                requestAnimationFrame(function () { target.focus(); });
            }
        }

        function openPanel() {
            opener = document.activeElement;
            overlay.classList.remove('is-closing');
            openLayer(dialog, overlay);
            focusBody();
            if (tabsNav) {
                setTimeout(function () { syncTabsIndicator(tabsNav, false); }, 0);
            }
        }

        function closePanel() {
            closeLayer(dialog, overlay, function () {
                restoreFocus();
                opener = null;
                if (typeof opts.onClose === 'function') opts.onClose();
            });
        }

        /**
         * 焦点归还：优先还给触发元素。
         * 但触发元素可能已经不可聚焦了 —— 典型场景是 SillyTavern 的 wand 扩展菜单：
         * 点击菜单项后菜单会自动收起，触发按钮变成不可见，focus() 静默失败，
         * 焦点就掉到了 body，键盘用户彻底失去位置。
         * 所以这里做三级兜底：触发元素 -> 备用元素(focusFallback) -> 面板容器。
         */
        function restoreFocus() {
            if (opener && typeof opener.focus === 'function' && isFocusable(opener)) {
                opener.focus();
                if (document.activeElement === opener) return;
            }
            var fb = opts.focusFallback;
            var target = null;
            if (typeof fb === 'string') target = document.querySelector(fb);
            else if (fb && typeof fb.focus === 'function') target = fb;
            if (target && isFocusable(target)) {
                target.focus();
                return;
            }
            /* 最后兜底：焦点落在面板容器上（保留 aria-modal 语义下的上下文） */
            if (typeof panel.focus === 'function') {
                if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
                panel.focus();
            }
        }

        on(closeBtn, 'click', closePanel);
        on(overlay, 'click', function (event) { if (event.target === overlay) closePanel(); });

        /* 焦点陷阱（focus trap）
           宿主红线禁止 showModal()（会给文档加 inert），所以「模态」是半手动实现的：
           面板声明了 aria-modal="true"，就必须真的把键盘焦点圈在面板内，
           否则读屏按模态处理、键盘却能跑到背景页 —— 声明与行为不符。
           这里监听面板内的 Tab / Shift+Tab，在首尾之间循环。 */
        var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        on(panel, 'keydown', function (event) {
            if (event.key !== 'Tab' || overlay.hidden) return;
            var items = Array.prototype.filter.call(
                panel.querySelectorAll(FOCUSABLE),
                function (node) {
                    return node.offsetWidth > 0 || node.offsetHeight > 0 || node === document.activeElement;
                }
            );
            if (!items.length) return;
            var first = items[0];
            var last = items[items.length - 1];
            var current = document.activeElement;
            if (event.shiftKey && (current === first || !panel.contains(current))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (current === last || !panel.contains(current))) {
                event.preventDefault();
                first.focus();
            }
        });

        /* Esc 关闭：走全局单例调度器，而不是给每个面板挂一个永久的
           document 级监听器（旧实现会导致监听器与 DOM 无限累积，
           且多面板时任一 Esc 会关闭全部可见面板）。
           调度器只把 Esc 交给「最上层可见面板」。 */
        registerEscapeHandler(closePanel, function () { return !overlay.hidden; });

        function addNode(key, node) {
            var pane = panes[key] || panes[active] || body;
            append(pane, node);
            return node;
        }

        function destroy() {
            unregisterEscapeHandler(closePanel);
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
            opener = null;
            if (typeof opts.destroy === 'function') opts.destroy();
        }

        return {
            id: id,
            dialog: dialog,
            overlay: overlay,
            panel: panel,
            body: body,
            tabs: tabsNav,
            bottomNav: bottomNav,
            open: openPanel,
            close: closePanel,
            destroy: destroy,
            setTab: setTab,
            syncIndicator: function () { if (tabsNav) syncTabsIndicator(tabsNav, false); },
            addNode: addNode,
            addSwitch: function (key, o) { return addNode(key, switchRow(o)); },
            addInput: function (key, o) { return addNode(key, inputRow(o)); },
            addAccordion: function (key, o) { return addNode(key, accordion(o)); },
            addProgress: function (key, o) { return addNode(key, progress(o)); },
            addSectionTitle: function (key, text) { return addNode(key, el('div', 'nvui-section-title', { text: text })); },
        };
    }

    /* ---------------------- 吐司 ---------------------- */

    function ensureToastLayer() {
        var layer = document.getElementById(TOAST_LAYER_ID);
        if (layer) return layer;
        var dialog = el('dialog', 'nvui-tl nvui-tl-toast', { id: TOAST_LAYER_ID, 'aria-label': '通知层' });
        var stack = el('div', 'nvui-toast-stack');
        dialog.appendChild(stack);
        document.body.appendChild(dialog);
        try { dialog.show(); } catch (err) { dialog.setAttribute('open', ''); }
        return dialog;
    }

    /**
     * showToast({ message, type, duration, icon })
     * type: 'success' | 'warn' | 'danger' | 'info' | undefined（默认中性）
     * 返回 { element, dismiss }。
     */
    function showToast(options) {
        var opts = options || {};
        syncGlassFallback();
        var layer = ensureToastLayer();
        var stack = q('.nvui-toast-stack', layer);
        var toast = el('div', 'nvui-toast' + (opts.type ? ' is-' + opts.type : ''), { role: 'status' });
        var ic = iconNode(opts.icon || 'fa-solid fa-circle-info');
        if (ic) toast.appendChild(ic);
        var text = el('span', null, { text: opts.message || '' });
        toast.appendChild(text);
        if (opts.dismissible !== false) {
            var close = el('button', 'nvui-icon-btn', { type: 'button', 'aria-label': '关闭通知' });
            close.appendChild(el('i', 'fa-solid fa-xmark', { 'aria-hidden': 'true' }));
            toast.appendChild(close);
            on(close, 'click', dismiss);
        }
        stack.appendChild(toast);
        var timer = null;

        function dismiss() {
            if (!toast.parentNode || toast.classList.contains('is-closing')) return;
            if (timer) clearTimeout(timer);
            toast.classList.add('is-closing');
            var removed = false;
            var fallback = null;
            function done() {
                if (removed) return;
                removed = true;
                if (fallback) { clearTimeout(fallback); fallback = null; }
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                if (stack && !stack.querySelector('.nvui-toast')) {
                    layer.hidden = true;
                    if (layer.open) {
                        try { layer.close(); } catch (err) { layer.removeAttribute('open'); }
                    }
                }
            }
            function onAnimEnd(event) {
                /* animationend 冒泡：只认吐司自身的退场动画 */
                if (event && event.target !== toast) return;
                if (event && event.animationName && event.animationName.indexOf('out') === -1) return;
                done();
            }
            on(toast, 'animationend', onAnimEnd);
            fallback = setTimeout(done, 260);
        }

        if (opts.duration !== 0) {
            timer = setTimeout(dismiss, typeof opts.duration === 'number' ? opts.duration : 3200);
        }
        return { element: toast, dismiss: dismiss };
    }

    /* ---------------------- 导出 ---------------------- */

    return {
        version: VERSION,
        VERSION: VERSION,
        PANEL_CLASS: PANEL_CLASS,
        classes: {
            panel: 'nvui-panel',
            overlayPanel: 'nvui-overlay is-panel',
            tabs: 'nvui-tabs',
            tab: 'nvui-tab',
            tabpane: 'nvui-tabpane',
            bottomNav: 'nvui-bottom-nav',
            bottomNavItem: 'nvui-bottom-nav-item',
            accordion: 'nvui-acc',
            switchRow: 'nvui-switch-row',
            inputRow: 'nvui-input-row',
            toast: 'nvui-toast',
        },
        getToken: getToken,
        setTheme: setTheme,
        detectGlassSupport: detectGlassSupport,
        syncGlassFallback: syncGlassFallback,
        openLayer: openLayer,
        closeLayer: closeLayer,
        switchRow: switchRow,
        inputRow: inputRow,
        accordion: accordion,
        progress: progress,
        createPanel: createPanel,
        showToast: showToast,
    };
});
