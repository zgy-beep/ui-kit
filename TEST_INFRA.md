# Test Infrastructure Specification: SillyTavern UI Kit v2.6.0

## 1. Test Philosophy

The testing infrastructure for SillyTavern UI Kit v2.6.0 adheres to the following principles:

1. **Opaque-Box Verification**: Tests interact strictly with public API surfaces (`NVUI.createPanel`, `NVUI.setTheme`, `NVUI.clearLayoutState`, `panel.open`, `panel.close`, `panel.destroy`, `panel.showUpdate`, `panel.clearLayoutState`), observable DOM elements (`.nvui-panel`, `.nvui-theme-toggle`, `.nvui-update-pill`), storage artifacts (`localStorage` keys `nvui_state_${id}`), and HTTP/browser runtime events. Internal implementation details are never asserted directly unless mandated by static security and structural contracts.
2. **Requirement-Driven Derivation**: Every test case directly derives from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `ISSUES.md` (#5 and #6).
3. **Zero-Dependency Runtime Respect**: The UI Kit runtime has zero external npm dependencies. The test runner uses native Node.js APIs and standalone browser automation via `playwright-core` with Google Chrome.
4. **Authoritative Expected Output**: Expected outputs are derived from the specifications in `ORIGINAL_REQUEST.md` and the mathematical clamping models documented in `survey_spec_miner/handoff.md`.
5. **Real-Host End-to-End Validation**: In addition to synthetic DOM and browser context verification, tests execute against a live SillyTavern host at `http://127.0.0.1:8000`, validating real-world plugin execution with a strict zero-pageerror requirement.

---

## 2. Test Execution Architecture & Toolchain

### 2.1 Execution Command
```bash
node test/test-e2e-v250.js
```
Options supported:
- `--tier=1|2|3|4`: Run only the specified test tier.
- `--filter=<regex>`: Filter tests by pattern in test name.
- `--no-host`: Skip live SillyTavern host tests (running purely in local browser contexts).
- `--verbose`: Echo detailed console logs and diagnostic payloads.

### 2.2 Automation Toolchain
- **Runtime**: Node.js v24+
- **Browser Automation**: `playwright-core` (located at `C:\Users\Administrator\.workbuddy\binaries\node\workspace\node_modules\playwright-core` or standard `NODE_PATH`)
- **Browser Engine**: Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`), launched with `--no-sandbox --disable-dev-shm-usage`
- **Network Isolation**: Proxy environment variables (`http_proxy`, `https_proxy`, `all_proxy`) stripped; `NO_PROXY=*` enforced to prevent loopback proxy issues.
- **Diagnostics**: Real-time tracking of `pageerror`, `console.error`, uncaught exceptions, and assertion tables with formatted summary reporting.

### 2.3 Issue-specific Browser Regressions (local)

```bash
node test/test-issues-9-10-forms.js
node test/test-issue-11-accordion.js
```

- Both scripts run against local pages (static DOM / ephemeral HTTP server); no active SillyTavern service is required.
- `test-issues-9-10-forms.js` (#9 / #10) reads `tokens.css` / `components.css` directly. Optional env: `CHROME_PATH` (Chrome/Edge executable), `PLAYWRIGHT_MODULE_PATH` (`playwright-core` directory).
- `test-issue-11-accordion.js` (#11) starts its own ephemeral server. Optional env: `ST_CHROME` (Chrome executable); `playwright-core` resolves via `NODE_PATH` or the built-in fallback.

---

## 3. Feature Inventory Coverage Matrix

| Feature ID | Feature Name | Requirement Ref | Target Milestone | Tier 1 Tests | Tier 2 Tests | Tier 3 Tests | Tier 4 Scenarios |
|---|---|---|---|---|---|---|---|
| F-01 | `createPanel` persist option (`true` / object) | R1 / Issue #5 | M1 | T1-R1-01 ~ 03 | T2-BC-01 | T3-CB-01 | T4-SC-01, 02 |
| F-02 | `StorageAdapter` pluggable interface | R1 / Issue #5 | M1 | T1-R1-04 ~ 06 | T2-BC-02 | T3-CB-02 | T4-SC-01 |
| F-03 | 250ms debounced write engine | R1 / Issue #5 | M1 | T1-R1-07 ~ 09 | T2-BC-03 | T3-CB-04 | T4-SC-04 |
| F-04 | Viewport Clamping (4K to mobile) | R1 / Issue #5 | M1 | T1-R1-10 ~ 12 | T2-BC-04, 05 | T3-CB-04 | T4-SC-03 |
| F-05 | `clearLayoutState` APIs | R1 / Issue #5 | M1 | T1-R1-13 ~ 15 | T2-BC-06 | T3-CB-05 | T4-SC-01, 04 |
| F-06 | Standardized Header action ordering | R2 / Issue #6 | M2 | T1-R2-01 ~ 03 | T2-BC-07 | T3-CB-01 | T4-SC-01, 02 |
| F-07 | Preset `themeToggle` button & icon transition | R2 / Issue #6 | M2 | T1-R2-04 ~ 07 | T2-BC-08 | T3-CB-01 | T4-SC-01, 02 |
| F-08 | `onThemeChange` callback & `setTheme` sync | R2 / Issue #6 | M2 | T1-R2-08 ~ 10 | T2-BC-09 | T3-CB-01 | T4-SC-01 |
| F-09 | Version update pill & `panel.showUpdate` | R2 / Issue #6 | M2 | T1-R2-11 ~ 14 | T2-BC-10, 11 | T3-CB-02 | T4-SC-01 |
| F-10 | Update pill A11y & Flat Glass no-outline | R2 / Issue #6 | M2 | T1-R2-15 ~ 18 | T2-BC-12 | T3-CB-02 | T4-SC-01 |
| F-11 | SillyTavern ESM calling paradigm | R3 | M3 | T1-R3-01 ~ 03 | T2-BC-13 | T3-CB-02 | T4-SC-01 |
| F-12 | Tavern Helper single-file IIFE paradigm | R3 | M3 | T1-R3-04 ~ 06 | T2-BC-14 | T3-CB-01 | T4-SC-02 |
| F-13 | Safe migration & FAQ compliance | R3 | M3 | T1-R3-07 ~ 09 | T2-BC-15 | T3-CB-05 | T4-SC-01, 02 |
| F-14 | 6-place version alignment to 2.5.0 | R3 | M3 | T1-R3-10 ~ 13 | T2-BC-16 | N/A | T4-SC-05 |
| F-15 | Live SillyTavern Host & Zero Pageerror | R4 | M4 | T1-R4-01 ~ 05 | T2-BC-17 | T3-CB-06 | T4-SC-05 |
| F-16 | Host form-control isolation (`dialog.nvui-tl` / `.nvui-panel`, 7 bounded `!important`) | Issue #9 | v2.6.0 | local `test/test-issues-9-10-forms.js` | — | — | browser context matrix (carrier × theme) |
| F-17 | Independent `.nvui-checkbox` (16px, `:checked` / `:indeterminate`, host `::before` suppression) | Issue #10 | v2.6.0 | local `test/test-issues-9-10-forms.js` | — | — | browser context matrix |
| F-18 | Injected accordion adoption (`trackAccordion` / `adoptAccordions`, raw keys, idempotent re-render) | Issue #11 | v2.6.0 | local `test/test-issue-11-accordion.js` | — | — | re-render / close-rebuild / CJK keys / destroy |

---

## 4. 4-Tier Test Methodology & Specification Details

### 4.1 Tier 1: Feature Coverage (>=5 test cases per feature area)

#### R1: Layout State Persistence Engine
- **T1-R1-01**: `createPanel({ persist: true })` creates a panel with persistent lifecycle attached; state defaults are loaded when no stored state exists.
- **T1-R1-02**: Panel size adjustments are saved into `window.localStorage` under key `nvui_state_${id}`.
- **T1-R1-03**: Reopening panel or creating a new panel with same ID correctly restores saved width and height from localStorage.
- **T1-R1-04**: Active tab switching is recorded to persistent storage; re-opening the panel restores the active tab.
- **T1-R1-05**: Accordion open/collapse states are tracked per item key; state persists and restores on next open.
- **T1-R1-06**: `persist: { size: false, tab: true }` ignores size changes but persists tab selection.
- **T1-R1-07**: Custom `StorageAdapter` with `get(key)` and `set(key, val)` receives reads and debounced writes.
- **T1-R1-08**: 250ms debounced write consolidates multiple rapid state changes into a single storage write.
- **T1-R1-09**: Closing or destroying the panel flushes any pending debounced writes immediately.
- **T1-R1-10**: `NVUI.clearLayoutState(id)` removes the stored layout state from default localStorage.
- **T1-R1-11**: `NVUI.clearLayoutState(id, customStorage)` removes state using the custom storage adapter.
- **T1-R1-12**: `panel.clearLayoutState()` clears storage and immediately resets the active panel's DOM styles to default dimensions.

#### R2: Standardized Panel Header
- **T1-R2-01**: Panel header actions order follows strictly: `[custom actions...] -> [themeToggle] -> [closeBtn]`.
- **T1-R2-02**: When no custom actions are specified, `themeToggle` sits immediately to the left of `closeBtn`.
- **T1-R2-03**: Action buttons in header use `.nvui-icon-btn` without borders or outlines.
- **T1-R2-04**: `themeToggle: true` renders a button with `.nvui-theme-toggle` in header actions.
- **T1-R2-05**: Clicking `.nvui-theme-toggle` toggles `.nvui-theme-light` on `document.body` via `NVUI.setTheme`.
- **T1-R2-06**: Theme toggle button alternates between Sun (`fa-sun`) and Moon (`fa-moon`) icons with smooth transition CSS.
- **T1-R2-07**: `themeToggle` has proper `aria-label` ("切换为浅色主题" / "切换为深色主题").
- **T1-R2-08**: `opts.onThemeChange` callback is called with the next theme ('light' or 'dark') upon clicking.
- **T1-R2-09**: `opts.themeToggle.onThemeChange` object syntax callback is correctly invoked.
- **T1-R2-10**: `createPanel({ update: { version: '2.5.0', label: '新版本' } })` renders static badge in `.nvui-panel-title`.
- **T1-R2-11**: `panel.showUpdate({ version: '2.5.1', label: 'v2.5.1 可用' })` dynamically injects `.nvui-update-pill` into `.nvui-panel-title`.
- **T1-R2-12**: Calling `panel.showUpdate(null)` smoothly removes the update pill.
- **T1-R2-13**: Update pill uses `role="button"` and `tabindex="0"`.
- **T1-R2-14**: Pressing Enter or Space on the focused update pill triggers `onClick` handler or navigates to `url`.
- **T1-R2-15**: Update pill conforms to Flat Glass design with zero border outlines (no 1px solid border).

#### R3: User Calling Paradigms & Version Integrity
- **T1-R3-01**: SillyTavern ESM calling paradigm: `extension_settings` mock storage adapter properly reads and writes.
- **T1-R3-02**: Tavern Helper IIFE calling paradigm: works zero-build with direct script inclusion and default `localStorage`.
- **T1-R3-03**: Safe migration: existing v2.4.0 panels created without `persist` or `themeToggle` behave identically without regression.
- **T1-R3-04**: 6-place version alignment: `package.json`, `tokens.json`, `tokens.css`, `nvui-api.js`/`components.css`, `README.md`, `AI-GUIDE.md` all declare version `2.5.0`.
- **T1-R3-05**: Template parity: `st-extension-template/ui-kit/` assets match repository root assets.

#### R4: Live SillyTavern Host & Zero Pageerrors
- **T1-R4-01**: SillyTavern host on `http://127.0.0.1:8000` is reachable and returns HTTP 200.
- **T1-R4-02**: UI Kit injected into live SillyTavern host executes without throwing.
- **T1-R4-03**: Panel can open, switch tabs, toggle accordion, and close inside live SillyTavern DOM.
- **T1-R4-04**: Theme toggle functions without altering SillyTavern core stylesheet invariants.
- **T1-R4-05**: Entire host test run finishes with 0 `pageerror` events and 0 uncaught exceptions.

---

### 4.2 Tier 2: Boundary & Corner Cases (>=5 test cases per dimension)

- **T2-BC-01: Empty & Invalid Persist Configuration**
  - Passing `persist: {}` defaults all sub-flags (`size`, `tab`, `accordion`) to `true` with default `localStorage`.
  - Passing invalid non-object values (`persist: 123` or `persist: "true"`) logs a warning and falls back gracefully without crashing.
- **T2-BC-02: Storage Write Exceptions (QuotaExceeded & Sandboxed Storage)**
  - When `localStorage.setItem` throws `QuotaExceededError` or `SecurityError`, the adapter catches the exception, emits a warning, falls back to in-memory session persistence, and does not interrupt UI interactions.
- **T2-BC-03: Viewport Clamping: 4K Desktop to Mobile Viewport**
  - Stored size of 1600x1200 saved in 4K resolution (3840x2160) loaded into a mobile viewport (390x844).
  - Width inline style is cleared, falling back to 100% drawer layout; height is clamped to <= 92vh. Close button remains fully visible and clickable.
- **T2-BC-04: Viewport Clamping: Multi-Monitor Off-Screen Recovery**
  - Stored coordinates `(x: 2500, y: 1500)` from a disconnected secondary monitor.
  - When loaded in a single 1440x900 viewport, coordinates clamp to safe bounds `(x <= vw - width - 16, y <= vh - height - 16)`.
- **T2-BC-05: Missing / Deleted Tab Key Recovery**
  - Stored `tab` points to an obsolete key `'deprecated_tab'` not present in the panel's current `tabs` configuration.
  - Panel self-heals by activating the first available valid tab and logging a warning.
- **T2-BC-06: Orphaned Accordion State Handling**
  - Stored state contains accordion keys that no longer exist in the DOM.
  - Panel applies states only to matching elements and silently ignores orphans.
- **T2-BC-07: XSS Attack Payload in Update Pill**
  - Calling `panel.showUpdate({ version: '<script>alert("XSS")</script>', label: '<img src=x onerror=alert(1)>' })`.
  - The badge uses `textContent` and `createTextNode`; HTML tags are rendered verbatim as text and script never executes.
- **T2-BC-08: Malicious Pseudo-Protocol in Update URL**
  - Calling `panel.showUpdate({ version: '2.5.0', url: 'javascript:alert(document.cookie)' })`.
  - The handler rejects or disables `javascript:` pseudo-protocols, preventing script injection on click.

---

### 4.3 Tier 3: Cross-Feature Combinations (Pairwise Coverage)

- **T3-CB-01: Simultaneous `persist: true` + `themeToggle: true`**
  - User opens panel, resizes it, clicks theme toggle.
  - Theme switches, panel layout state is saved; theme toggle button icon and state are preserved; neither interferes with the other.
- **T3-CB-02: Custom Storage Adapter + Dynamic `showUpdate` Pill**
  - Panel uses custom asynchronous `extension_settings` adapter.
  - Dynamic call to `panel.showUpdate(...)` displays the update pill without triggering redundant layout persistence writes.
- **T3-CB-03: Accordion State Persistence Across Tab Switches & Panel Reopen**
  - User expands Accordion A in Tab 1, switches to Tab 2, switches back to Tab 1. Accordion A remains expanded.
  - Panel is closed and reopened; Accordion A state remains accurately restored.
- **T3-CB-04: Active 250ms Debounce with Viewport Resize & Clamping**
  - Rapid resize events trigger debounce; before 250ms fires, the browser window is resized.
  - Clamping logic dynamically adjusts dimensions; the debounced flush writes the correctly clamped dimensions.
- **T3-CB-05: `clearLayoutState` Invocation on Open Panel**
  - User clears state while panel is actively open via `panel.clearLayoutState()`.
  - Storage is deleted, inline width/height reset to CSS defaults, active tab reset without DOM destruction or event listener breakage.
- **T3-CB-06: Multi-Panel Key Sandbox Isolation**
  - Two distinct panels (`id: 'plugin_a_panel'`, `id: 'plugin_b_panel'`) persist states simultaneously.
  - Keys `nvui_state_plugin_a_panel` and `nvui_state_plugin_b_panel` maintain separate records; clearing one does not affect the other.

---

### 4.4 Tier 4: Real-World Application Scenarios

- **T4-SC-01: Scenario 1 — SillyTavern Standard Extension Lifecycle**
  - Complete simulation of a SillyTavern ESM extension:
    1. Initializes with mock `extension_settings`.
    2. Builds a panel with `storage: stStorageAdapter`, `themeToggle: true`, and `onThemeChange`.
    3. Asynchronously queries mock GitHub release endpoint.
    4. Triggers `panel.showUpdate({ version: 'v2.5.1', url: '...' })`.
    5. User clicks update pill, triggering handler.
    6. Panel closes, settings are flushed via debounced writer.
- **T4-SC-02: Scenario 2 — Tavern Helper Single-File Script Zero-Build Paradigm**
  - Simulates a Tampermonkey / user-script scenario:
    1. Injects Kit into page dynamically.
    2. Calls `NVUI.createPanel({ persist: true, themeToggle: true })`.
    3. External floating trigger opens panel.
    4. Switch controls toggled; localStorage updated; theme toggled.
- **T4-SC-03: Scenario 3 — Multi-Window Cross-Monitor Resolution Shift**
  - Simulates moving a browser window from 4K/high-DPI display to mobile device:
    1. Large viewport (1920x1080) opens and resizes panel to 1200x800.
    2. Context changes viewport to 390x844 (iPhone 14 size).
    3. Panel opens; clamping algorithm ensures header and close button are inside viewable bounds.
- **T4-SC-04: Scenario 4 — Fast Repeated Panel Toggle & Debounce Stress**
  - Simulates a user rapidly opening, dragging, and closing panels in <100ms intervals:
    1. 10 rapid open/close cycles with simulated size mutations.
    2. Verify all pending debounce timers flush or terminate cleanly.
    3. No memory leaks, orphan DOM nodes, or unhandled promise rejections.
- **T4-SC-05: Scenario 5 — Full Host E2E Probe on Live SillyTavern**
  - Executes directly on `http://127.0.0.1:8000`:
    1. Connects to live SillyTavern instance.
    2. Injects UI Kit v2.5.0.
    3. Opens panel alongside native ST elements (`#chat`, `#top-settings-holder`).
    4. Interacts with theme toggle and confirms zero console errors or `pageerror` events.

---

## 5. Test Output & Assertion Reporting Protocol

The test runner `node test/test-e2e-v250.js` outputs:
- Real-time formatted test logs: `[PASS] <test_id>: <description>` or `[FAIL] <test_id>: <description> -> <diagnostic>`.
- Aggregated summary table:
  - Total tests executed
  - Passed count
  - Failed count
  - Skipped / Pending count
  - Duration in ms
- Exit Code: `0` if all tests pass; `1` if any test fails.
