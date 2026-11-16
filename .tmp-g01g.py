import io

PATH = 'nvui-api.js'
src = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
lines = src.split('\n')


def idx(text, start=0):
    for i in range(start, len(lines)):
        if lines[i] == text:
            return i
    raise AssertionError('anchor not found: ' + text[:80])


MODULE = '''    /**
     * 玻璃模式控制器（G-01 第七步）。
     *
     * 收进四份状态（请求模式 / 生效模式 / 系统偏好 MQ / 清理句柄）与三个出口
     * （setMode / getState / dispose），面板侧不再直接读写 effectiveGlassMode。
     * 创建时机必须紧贴 dialog：applyPanelGlassMode() 要在挂载前先跑一次，
     * 否则首帧会闪一帧实体背景再切到玻璃。
     */
    function createGlassController(ctx) {
        var dialog = ctx.dialog;
        var mode = normalizeGlassMode(ctx.mode);
        var effective = applyPanelGlassMode(dialog, mode);
        var mediaCleanup = null;

        /* force 模式需要跟随系统「减少透明度 / 强制颜色」动态让位；auto/solid 也同步一次。 */
        function refresh() {
            effective = applyPanelGlassMode(dialog, mode);
            return effective;
        }

        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            var glassMqs = [
                window.matchMedia('(prefers-reduced-transparency: reduce)'),
                window.matchMedia('(forced-colors: active)'),
            ];
            var onGlassPrefChange = function () { refresh(); };
            glassMqs.forEach(function (mq) {
                if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', onGlassPrefChange);
            });
            mediaCleanup = function () {
                glassMqs.forEach(function (mq) {
                    if (mq && typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onGlassPrefChange);
                });
            };
        }

        return {
            setMode: function (next) {
                mode = normalizeGlassMode(next);
                return refresh();
            },
            getState: function () {
                var reason = '';
                if (mode === 'force' && effective !== 'force') {
                    reason = !browserSupportsBackdrop() ? 'backdrop-unsupported' : 'preference-blocked';
                } else if (effective === 'auto' && isDomAvailable() && document.body
                    && document.body.classList.contains('no-blur')) {
                    reason = 'host-no-blur';
                }
                return {
                    mode: mode,
                    effective: effective,
                    fastUI: !!(isDomAvailable() && document.body && document.body.classList.contains('no-blur')),
                    browserSupports: browserSupportsBackdrop(),
                    preferenceBlocked: glassPreferenceBlocksForce(),
                    reason: reason,
                };
            },
            dispose: function () {
                if (mediaCleanup) { mediaCleanup(); mediaCleanup = null; }
            },
        };
    }

'''

# 1) 插入模块
i = idx('    function createPanel(options) {')
assert lines[i - 1] == '', 'expected blank line before createPanel'
lines[i:i] = MODULE.split('\n')[:-1]
cp = i + len(MODULE.split('\n')) - 1

# 2) 删除三份状态变量
old_state = '''        var glassMode = normalizeGlassMode(opts.glass);
        var effectiveGlassMode = glassMode;
        var glassMediaCleanup = null;
'''
j = next(k for k in range(cp, len(lines)) if lines[k] == '        var glassMode = normalizeGlassMode(opts.glass);')
assert '\n'.join(lines[j:j + 3]) + '\n' == old_state, '\n'.join(lines[j:j + 3])
del lines[j:j + 3]

# 3) 属性改用内联归一化（面板侧不再持有 glassMode 变量）
j = idx("            'data-nvui-glass-mode': glassMode,", cp)
lines[j] = "            'data-nvui-glass-mode': normalizeGlassMode(opts.glass),"

# 4) 替换 apply + refresh 函数 + MQ 监听块
start = idx('        effectiveGlassMode = applyPanelGlassMode(dialog, glassMode);', cp)
end = idx('        /* 初始自定义宽度（opts.width，默认交由 CSS / token 720px） */', start)
block = '\n'.join(lines[start:end])
assert 'function refreshPanelGlassMode()' in block
assert 'glassMediaCleanup = function ()' in block
assert 'glassMqs.forEach' in block
new_block = '''        /* 玻璃模式控制器（G-01 第七步）：模式状态、系统偏好监听与生效值计算都在 factory 内，
           面板侧只保留 setMode / getState 两个出口（destroy 时 dispose）。 */
        var glassCtl = createGlassController({ dialog: dialog, mode: opts.glass });'''
lines[start:end] = new_block.split('\n')

# 5) destroy 里的清理
j = idx('            if (glassMediaCleanup) { glassMediaCleanup(); glassMediaCleanup = null; }', cp)
lines[j] = '            glassCtl.dispose();'

# 6) 控制器两个玻璃出口
j = idx('            setGlassMode: function (mode) {', cp)
assert lines[j + 1] == '                glassMode = normalizeGlassMode(mode);'
assert lines[j + 2] == '                effectiveGlassMode = applyPanelGlassMode(dialog, glassMode);'
assert lines[j + 3] == '                return effectiveGlassMode;'
assert lines[j + 4] == '            },'
lines[j:j + 5] = [
    '            setGlassMode: function (mode) {',
    '                return glassCtl.setMode(mode);',
    '            },',
]

j = idx('            getGlassState: function () {', cp)
# 找到该方法的结尾：从 j 起第一个恰好 14 空格 + '},'
k = next(x for x in range(j + 1, len(lines)) if lines[x] == '            },')
body = '\n'.join(lines[j:k + 1])
assert 'glassMode ===' in body and 'effectiveGlassMode ===' in body
lines[j:k + 1] = [
    '            getGlassState: function () {',
    '                return glassCtl.getState();',
    '            },',
]

out = '\n'.join(lines)
assert 'glassMediaCleanup' not in out
assert 'effectiveGlassMode' not in out
assert 'glassMode' not in out.replace('data-nvui-glass-mode', '').replace('normalizeGlassMode', '')

io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
print('glass extracted')
