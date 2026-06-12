# 证件复印小工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个单 HTML 文件的证件复印小工具，把身份证、营业执照、学历证、护照等证件图按 A4 版式合成，叠加可选水印，导出 PDF / PNG / JPG 或调起系统打印，所有处理纯本地完成。

**Architecture:** 开发期使用 ES 模块拆分为 9 个独立模块（state / upload / imageStore / cropper / watermark / layout / renderer / exporter / templates），通过 Vitest 对纯函数模块做 TDD；构建期用 esbuild 将所有模块打包成 IIFE，再用一个 Node 脚本把脚本、样式、pdf-lib 内联到单个 `dist/index.html` 中作为最终交付物。锁定 1∶1 与自适应两套尺寸规则在 `layout.compose()` 中分支处理，PagePlan 全部使用毫米单位，保证 PDF 与系统打印都能 1∶1 出图。

**Tech Stack:**
- 运行时：原生浏览器（Chrome / Edge / Safari 16+ / Firefox），无服务端
- 第三方库：`pdf-lib`（vendored 为 `vendor/pdf-lib.min.js`，build 时内联）
- 开发依赖：`vitest`、`happy-dom`、`esbuild`（仅构建期使用，不进交付产物）
- 安全：CSP `<meta>` 标签禁止任何外部请求；用户文本只走 `textContent` / `Canvas.fillText`

**File Map**：

```
证件复印小工具/
├─ docs/superpowers/{specs,plans}/...
├─ package.json
├─ vitest.config.mjs
├─ build.mjs                            # 构建脚本
├─ .gitignore
├─ vendor/
│   └─ pdf-lib.min.js                   # 一次性 vendored
├─ src/
│   ├─ index.template.html              # 含 <!-- INLINE:* --> 占位符
│   ├─ styles.css
│   ├─ main.js                          # 入口
│   ├─ constants.js                     # 证件类型、A4、默认配置
│   ├─ state.js                         # createStore
│   ├─ layout.js                        # compose() → PagePlan[]
│   ├─ watermark.js                     # drawTo(ctx, config, ...)
│   ├─ templateSchema.js                # sanitizeTemplate()
│   ├─ imageStore.js                    # createImageStore()
│   ├─ upload.js                        # bindUploadZone()
│   ├─ cropper.js                       # mountCropper()
│   ├─ renderer.js                      # renderPage(plan) → Canvas
│   ├─ exporter.js                      # toPng / toJpg / toPdf / print
│   ├─ templates.js                     # createTemplateService()
│   ├─ selftest.js                      # ?test=1 自检
│   └─ ui/
│       ├─ leftPanel.js                 # 证件列表
│       ├─ middlePanel.js               # A4 预览
│       └─ rightPanel.js                # 水印 + 版式 + 模板
├─ tests/
│   ├─ state.test.js
│   ├─ layout.test.js
│   ├─ watermark.test.js
│   ├─ templateSchema.test.js
│   └─ templates.test.js
├─ templates/                           # 三份预设 JSON
│   ├─ 投标红.json
│   ├─ 灰度复印.json
│   └─ 低调灰.json
├─ dist/
│   └─ index.html                       # 最终交付物
└─ README.md
```

---

## Phase 0：仓库与构建基线

### Task 1：初始化 npm 项目与依赖

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `vitest.config.mjs`

- [ ] **Step 1：初始化 git 与 npm**

```bash
cd "/Users/wangyuehua/Downloads/证件复印小工具"
git init
npm init -y
```

- [ ] **Step 2：写入 `.gitignore`**

```gitignore
node_modules/
dist/
.superpowers/
.DS_Store
```

- [ ] **Step 3：安装开发依赖**

```bash
npm i -D vitest@^2 happy-dom@^15 esbuild@^0.24 pdf-lib@^1.17
```

- [ ] **Step 4：vendor pdf-lib（一次性，进版本控制）**

```bash
mkdir -p vendor
cp node_modules/pdf-lib/dist/pdf-lib.min.js vendor/pdf-lib.min.js
```

- [ ] **Step 5：把 npm scripts 写入 `package.json`**

把 `package.json` 中的 `"scripts"` 替换为：

```json
{
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node build.mjs",
    "dev": "node build.mjs && python3 -m http.server -d dist 8088"
  }
}
```

- [ ] **Step 6：写入 `vitest.config.mjs`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    globals: false
  }
});
```

- [ ] **Step 7：验证依赖安装**

```bash
npx vitest --version
npx esbuild --version
ls -la vendor/pdf-lib.min.js
```

预期：vitest 与 esbuild 输出版本号；`pdf-lib.min.js` 大小约 290KB。

- [ ] **Step 8：提交**

```bash
git add package.json package-lock.json vitest.config.mjs .gitignore vendor/
git commit -m "chore: init npm project with vitest, esbuild, vendored pdf-lib"
```

---

### Task 2：构建脚本 `build.mjs`

**Files:**
- Create: `build.mjs`
- Create: `src/index.template.html`
- Create: `src/styles.css`（先放一个空骨架）
- Create: `src/main.js`（先放一个空导出）

- [ ] **Step 1：写空骨架 `src/styles.css`**

```css
:root { --bg: #fff; }
body { margin: 0; font-family: -apple-system, "Helvetica Neue", "PingFang SC", sans-serif; }
```

- [ ] **Step 2：写空骨架 `src/main.js`**

```js
// 入口：构建期由 esbuild 打包进 dist/index.html
console.log('id-copy-tool boot');
```

- [ ] **Step 3：写 HTML 模板 `src/index.template.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self' data: blob:;
           script-src 'self' 'unsafe-inline';
           connect-src 'none';
           img-src 'self' data: blob:;
           style-src 'self' 'unsafe-inline'">
<title>证件复印小工具</title>
<style>
/* INLINE:CSS */
</style>
</head>
<body>
<div id="app"></div>
<script>
/* INLINE:VENDOR */
</script>
<script>
/* INLINE:APP */
</script>
</body>
</html>
```

- [ ] **Step 4：写构建脚本 `build.mjs`**

```js
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { build as esbuild } from 'esbuild';
import { dirname } from 'node:path';

const ROOT = new URL('./', import.meta.url);

const template = await readFile(new URL('src/index.template.html', ROOT), 'utf8');
const css      = await readFile(new URL('src/styles.css',           ROOT), 'utf8');
const vendor   = await readFile(new URL('vendor/pdf-lib.min.js',    ROOT), 'utf8');

const bundle = await esbuild({
  entryPoints: [new URL('src/main.js', ROOT).pathname],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none'
});
const app = bundle.outputFiles[0].text;

const html = template
  .replace('/* INLINE:CSS */',    () => css)
  .replace('/* INLINE:VENDOR */', () => vendor)
  .replace('/* INLINE:APP */',    () => app);

await mkdir(new URL('dist/', ROOT), { recursive: true });
await writeFile(new URL('dist/index.html', ROOT), html);

const sizeKb = (html.length / 1024).toFixed(1);
console.log(`dist/index.html written (${sizeKb} KB)`);
```

- [ ] **Step 5：跑一次构建并验证**

```bash
npm run build
ls -la dist/index.html
```

预期：输出 `dist/index.html written (≈300-400 KB)`；用浏览器打开 `dist/index.html`，DevTools Console 应显示 `id-copy-tool boot`，无任何 CSP 报错或网络请求。

- [ ] **Step 6：提交**

```bash
git add build.mjs src/
git commit -m "build: add esbuild + html inliner producing single-file dist/index.html"
```

---

## Phase 1：纯函数模块（TDD）

### Task 3：常量与文档类型表

**Files:**
- Create: `src/constants.js`
- Create: `tests/constants.test.js`

- [ ] **Step 1：先写测试 `tests/constants.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  A4, DOCUMENT_KINDS, DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS, MM_PER_PT
} from '../src/constants.js';

describe('constants', () => {
  it('A4 是 210×297 mm', () => {
    expect(A4).toEqual({ wMm: 210, hMm: 297 });
  });

  it('身份证类全部锁定 1:1 且 85.6×54', () => {
    for (const k of ['idCard', 'drivingLicense', 'hkMacau']) {
      expect(DOCUMENT_KINDS[k].sizeMode).toBe('fixed');
      expect(DOCUMENT_KINDS[k].physicalSize).toEqual({ wMm: 85.6, hMm: 54 });
    }
  });

  it('护照锁定 1:1 且 125×88', () => {
    expect(DOCUMENT_KINDS.passport.sizeMode).toBe('fixed');
    expect(DOCUMENT_KINDS.passport.physicalSize).toEqual({ wMm: 125, hMm: 88 });
  });

  it('营业执照、学历、荣誉、资质均为 fit', () => {
    for (const k of ['businessLicense', 'diploma', 'award', 'qualification', 'other']) {
      expect(DOCUMENT_KINDS[k].sizeMode).toBe('fit');
    }
  });

  it('默认水印开启、对角 -30 度', () => {
    expect(DEFAULT_WATERMARK.enabled).toBe(true);
    expect(DEFAULT_WATERMARK.angleDeg).toBe(-30);
    expect(DEFAULT_WATERMARK.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('PDF 单位换算正确（1 mm ≈ 2.8346 pt）', () => {
    expect(MM_PER_PT).toBeCloseTo(72 / 25.4, 3);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/constants.test.js
```

预期：FAIL，“Cannot find module ../src/constants.js”。

- [ ] **Step 3：实现 `src/constants.js`**

```js
export const A4 = { wMm: 210, hMm: 297 };

export const MM_PER_PT = 72 / 25.4;  // pdf-lib 用 pt；1 inch = 25.4 mm = 72 pt

const idCardSize  = { wMm: 85.6, hMm: 54 };
const passportSize = { wMm: 125,  hMm: 88 };

export const DOCUMENT_KINDS = {
  idCard:          { label: '身份证',       sizeMode: 'fixed', physicalSize: { ...idCardSize }, slots: ['front', 'back'] },
  drivingLicense:  { label: '驾驶证',       sizeMode: 'fixed', physicalSize: { ...idCardSize }, slots: ['front', 'back'] },
  hkMacau:         { label: '港澳通行证',   sizeMode: 'fixed', physicalSize: { ...idCardSize }, slots: ['front', 'back'] },
  passport:        { label: '护照内页',     sizeMode: 'fixed', physicalSize: { ...passportSize }, slots: ['front'] },
  businessLicense: { label: '营业执照',     sizeMode: 'fit',   physicalSize: { wMm: 297, hMm: 210 }, slots: ['front'] },
  diploma:         { label: '学历/学位证',  sizeMode: 'fit',   physicalSize: { wMm: 285, hMm: 210 }, slots: ['front'] },
  award:           { label: '荣誉证书',     sizeMode: 'fit',   physicalSize: { wMm: 285, hMm: 210 }, slots: ['front'] },
  qualification:   { label: '资质证书',     sizeMode: 'fit',   physicalSize: { wMm: 210, hMm: 297 }, slots: ['front'] },
  other:           { label: '其他',         sizeMode: 'fit',   physicalSize: { wMm: 210, hMm: 297 }, slots: ['front'] }
};

export const DEFAULT_WATERMARK = {
  enabled: true,
  text: '仅供{project}投标使用 {date}',
  project: '某某项目',
  color: '#dc2626',
  opacity: 0.35,
  fontSize: 14,
  angleDeg: -30,
  gapX: 140,
  gapY: 90,
  includeDate: true
};

export const DEFAULT_LAYOUT = {
  type: 'stack',     // stack | side | multi
  perPage: 1,
  margin: 18         // mm
};

export const DEFAULT_FILTERS = {
  grayscale: false,
  contrast: 1.0,
  brightness: 1.0
};

export const DEFAULT_TRANSFORM = {
  scale: 1,
  rotateDeg: 0,
  offsetX: 0,
  offsetY: 0,
  cropRect: null     // null = 不裁剪；否则 { x, y, w, h }（在原图像素坐标系）
};
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run tests/constants.test.js
```

预期：PASS（5 个测试全过）。

- [ ] **Step 5：提交**

```bash
git add src/constants.js tests/constants.test.js
git commit -m "feat(constants): document kinds with sizeMode and physical sizes in mm"
```

---

### Task 4：状态容器 `state.js`

**Files:**
- Create: `src/state.js`
- Create: `tests/state.test.js`

- [ ] **Step 1：先写测试 `tests/state.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/state.js';
import {
  DOCUMENT_KINDS, DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS, DEFAULT_TRANSFORM
} from '../src/constants.js';

const init = () => createStore();

describe('createStore — 初始状态', () => {
  it('documents 为空、layout/watermark/filters 取默认值', () => {
    const s = init().getState();
    expect(s.documents).toEqual([]);
    expect(s.layout).toEqual(DEFAULT_LAYOUT);
    expect(s.watermark).toEqual(DEFAULT_WATERMARK);
    expect(s.filters).toEqual(DEFAULT_FILTERS);
    expect(s.templates).toEqual([]);
    expect(s.activeDocId).toBeNull();
  });
});

describe('createStore — DOC actions', () => {
  it('DOC_ADD 按 kind 预设 sizeMode 与 physicalSize', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const [doc] = store.getState().documents;
    expect(doc.kind).toBe('idCard');
    expect(doc.sizeMode).toBe('fixed');
    expect(doc.physicalSize).toEqual({ wMm: 85.6, hMm: 54 });
    expect(doc.slots).toEqual({ front: null, back: null });
  });

  it('DOC_SET_KIND 切换类型后重置物理尺寸与 sizeMode', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_SET_KIND', docId: id, kind: 'diploma' });
    const doc = store.getState().documents[0];
    expect(doc.kind).toBe('diploma');
    expect(doc.sizeMode).toBe('fit');
    expect(doc.physicalSize).toEqual({ wMm: 285, hMm: 210 });
  });

  it('DOC_SET_SIZE_MODE 允许用户强制切换 fixed/fit', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'diploma' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_SET_SIZE_MODE', docId: id, mode: 'fixed' });
    expect(store.getState().documents[0].sizeMode).toBe('fixed');
  });

  it('DOC_SET_PHYSICAL_SIZE 限定为正数且不超过 A4 二倍', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'other' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_SET_PHYSICAL_SIZE', docId: id, wMm: 0, hMm: -5 });
    expect(store.getState().documents[0].physicalSize.wMm).toBeGreaterThan(0);
    store.dispatch({ type: 'DOC_SET_PHYSICAL_SIZE', docId: id, wMm: 9999, hMm: 9999 });
    expect(store.getState().documents[0].physicalSize.wMm).toBeLessThanOrEqual(420);
  });

  it('DOC_ADD_SLOT 将图片绑定到指定 slot，并附默认 transform/filters', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_ADD_SLOT', docId: id, slot: 'front', imageId: 'img_1' });
    const slot = store.getState().documents[0].slots.front;
    expect(slot.imageId).toBe('img_1');
    expect(slot.transform).toEqual(DEFAULT_TRANSFORM);
    expect(slot.filters).toEqual({ brightness: 1, contrast: 1, grayscale: false });
  });

  it('DOC_REMOVE 删除文档；activeDocId 指向被删则置为 null', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'ACTIVE_SET', docId: id });
    store.dispatch({ type: 'DOC_REMOVE', docId: id });
    expect(store.getState().documents).toEqual([]);
    expect(store.getState().activeDocId).toBeNull();
  });
});

describe('createStore — WATERMARK & LAYOUT', () => {
  it('WATERMARK_TOGGLE 切换 enabled', () => {
    const store = init();
    expect(store.getState().watermark.enabled).toBe(true);
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    expect(store.getState().watermark.enabled).toBe(false);
  });

  it('WATERMARK_SET 合并 patch 但保留 enabled', () => {
    const store = init();
    store.dispatch({ type: 'WATERMARK_TOGGLE' });   // 关到 false
    store.dispatch({ type: 'WATERMARK_SET', patch: { color: '#000000' } });
    expect(store.getState().watermark.color).toBe('#000000');
    expect(store.getState().watermark.enabled).toBe(false);
  });

  it('LAYOUT_SET 合并 patch', () => {
    const store = init();
    store.dispatch({ type: 'LAYOUT_SET', patch: { type: 'multi', perPage: 3 } });
    expect(store.getState().layout.type).toBe('multi');
    expect(store.getState().layout.perPage).toBe(3);
    expect(store.getState().layout.margin).toBe(18);
  });

  it('TEMPLATE_LOAD 应用模板但尊重当前 watermark.enabled', () => {
    const store = init();
    store.dispatch({ type: 'WATERMARK_TOGGLE' });   // 关闭
    store.dispatch({
      type: 'TEMPLATE_LOAD',
      template: {
        name: 't',
        watermark: { ...DEFAULT_WATERMARK, enabled: true, color: '#123456' },
        layout: { type: 'side', perPage: 1, margin: 10 },
        filters: { grayscale: true, brightness: 1, contrast: 1 }
      }
    });
    const s = store.getState();
    expect(s.watermark.enabled).toBe(false);          // 不被模板覆盖
    expect(s.watermark.color).toBe('#123456');        // 其它字段被覆盖
    expect(s.layout.type).toBe('side');
    expect(s.filters.grayscale).toBe(true);
  });
});

describe('createStore — subscribe', () => {
  it('每次 dispatch 都通知订阅者', () => {
    const store = init();
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    expect(spy).toHaveBeenCalledTimes(2);
    unsub();
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('未知 action 不抛错，状态不变', () => {
    const store = init();
    const before = store.getState();
    expect(() => store.dispatch({ type: 'NOPE' })).not.toThrow();
    expect(store.getState()).toBe(before);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/state.test.js
```

预期：FAIL，“Cannot find module ../src/state.js”。

- [ ] **Step 3：实现 `src/state.js`**

```js
import {
  DOCUMENT_KINDS, DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS, DEFAULT_TRANSFORM
} from './constants.js';

let _seq = 0;
const nextId = (p) => `${p}_${++_seq}`;

const clampSize = (v) => Math.max(5, Math.min(420, Number(v) || 5));

function blankSlots(kind) {
  const slots = {};
  for (const name of DOCUMENT_KINDS[kind].slots) slots[name] = null;
  return slots;
}

function newDocument(kind) {
  const meta = DOCUMENT_KINDS[kind] || DOCUMENT_KINDS.other;
  return {
    id: nextId('doc'),
    kind,
    sizeMode: meta.sizeMode,
    physicalSize: { ...meta.physicalSize },
    slots: blankSlots(kind)
  };
}

function newSlot(imageId) {
  return {
    imageId,
    transform: { ...DEFAULT_TRANSFORM, cropRect: null },
    filters: { brightness: 1, contrast: 1, grayscale: false }
  };
}

function initialState() {
  return {
    documents: [],
    layout: { ...DEFAULT_LAYOUT },
    watermark: { ...DEFAULT_WATERMARK },
    filters: { ...DEFAULT_FILTERS },
    templates: [],
    activeDocId: null
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'DOC_ADD': {
      const doc = newDocument(action.kind);
      return { ...state, documents: [...state.documents, doc], activeDocId: doc.id };
    }
    case 'DOC_REMOVE': {
      const documents = state.documents.filter(d => d.id !== action.docId);
      const activeDocId = state.activeDocId === action.docId ? null : state.activeDocId;
      return { ...state, documents, activeDocId };
    }
    case 'DOC_SET_KIND': {
      const meta = DOCUMENT_KINDS[action.kind] || DOCUMENT_KINDS.other;
      return mapDoc(state, action.docId, (d) => ({
        ...d,
        kind: action.kind,
        sizeMode: meta.sizeMode,
        physicalSize: { ...meta.physicalSize },
        slots: { ...blankSlots(action.kind), ...keepCommonSlots(d.slots, action.kind) }
      }));
    }
    case 'DOC_SET_SIZE_MODE':
      return mapDoc(state, action.docId, (d) => ({ ...d, sizeMode: action.mode }));
    case 'DOC_SET_PHYSICAL_SIZE':
      return mapDoc(state, action.docId, (d) => ({
        ...d,
        physicalSize: { wMm: clampSize(action.wMm), hMm: clampSize(action.hMm) }
      }));
    case 'DOC_ADD_SLOT':
      return mapDoc(state, action.docId, (d) => ({
        ...d,
        slots: { ...d.slots, [action.slot]: newSlot(action.imageId) }
      }));
    case 'DOC_REMOVE_SLOT':
      return mapDoc(state, action.docId, (d) => ({
        ...d,
        slots: { ...d.slots, [action.slot]: null }
      }));
    case 'DOC_SET_SLOT_TRANSFORM':
      return mapSlot(state, action.docId, action.slot, (s) => ({
        ...s, transform: { ...s.transform, ...action.patch }
      }));
    case 'DOC_SET_SLOT_FILTERS':
      return mapSlot(state, action.docId, action.slot, (s) => ({
        ...s, filters: { ...s.filters, ...action.patch }
      }));
    case 'LAYOUT_SET':
      return { ...state, layout: { ...state.layout, ...action.patch } };
    case 'WATERMARK_SET':
      return { ...state, watermark: { ...state.watermark, ...action.patch } };
    case 'WATERMARK_TOGGLE':
      return { ...state, watermark: { ...state.watermark, enabled: !state.watermark.enabled } };
    case 'FILTERS_SET':
      return { ...state, filters: { ...state.filters, ...action.patch } };
    case 'TEMPLATE_LOAD': {
      const t = action.template;
      const keepEnabled = state.watermark.enabled;
      return {
        ...state,
        watermark: { ...t.watermark, enabled: keepEnabled },
        layout: { ...state.layout, ...t.layout },
        filters: { ...state.filters, ...t.filters }
      };
    }
    case 'TEMPLATE_SAVE': {
      const list = state.templates.filter(x => x.id !== action.template.id);
      return { ...state, templates: [...list, action.template] };
    }
    case 'TEMPLATE_REMOVE':
      return { ...state, templates: state.templates.filter(x => x.id !== action.id) };
    case 'TEMPLATES_SET':
      return { ...state, templates: action.templates };
    case 'ACTIVE_SET':
      return { ...state, activeDocId: action.docId };
    default:
      return state;
  }
}

function mapDoc(state, id, fn) {
  return { ...state, documents: state.documents.map(d => d.id === id ? fn(d) : d) };
}

function mapSlot(state, docId, slotName, fn) {
  return mapDoc(state, docId, (d) => {
    const cur = d.slots[slotName];
    if (!cur) return d;
    return { ...d, slots: { ...d.slots, [slotName]: fn(cur) } };
  });
}

function keepCommonSlots(oldSlots, newKind) {
  const result = {};
  for (const name of DOCUMENT_KINDS[newKind].slots) {
    if (oldSlots[name]) result[name] = oldSlots[name];
  }
  return result;
}

export function createStore(seed = initialState()) {
  let state = seed;
  const listeners = new Set();
  return {
    getState() { return state; },
    dispatch(action) {
      state = reducer(state, action);
      for (const l of listeners) l(state, action);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run tests/state.test.js
```

预期：全部 PASS。

- [ ] **Step 5：提交**

```bash
git add src/state.js tests/state.test.js
git commit -m "feat(state): redux-style store with doc/layout/watermark/template reducers"
```

---

### Task 5：版式引擎 `layout.js`

`compose({ documents, layout, watermark }) → PagePlan[]`，按版式把每个 doc 的每个非空 slot 摆到 A4 上，fixed 类锁定毫米数，fit 类等比缩放。

**Files:**
- Create: `src/layout.js`
- Create: `tests/layout.test.js`

- [ ] **Step 1：写测试 `tests/layout.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { compose } from '../src/layout.js';
import { A4, DEFAULT_WATERMARK } from '../src/constants.js';

const idCardDoc = (id = 'd1', front = 'img_a', back = 'img_b') => ({
  id, kind: 'idCard', sizeMode: 'fixed',
  physicalSize: { wMm: 85.6, hMm: 54 },
  slots: {
    front: front ? { imageId: front, transform: {}, filters: {} } : null,
    back:  back  ? { imageId: back,  transform: {}, filters: {} } : null
  }
});

const businessDoc = (id = 'b1') => ({
  id, kind: 'businessLicense', sizeMode: 'fit',
  physicalSize: { wMm: 297, hMm: 210 },
  slots: { front: { imageId: 'img_biz', transform: {}, filters: {} } }
});

const layoutCfg = (overrides = {}) => ({
  type: 'stack', perPage: 1, margin: 18, ...overrides
});

const wmCfg = (enabled = true) => ({ ...DEFAULT_WATERMARK, enabled });

describe('compose — 空输入', () => {
  it('无文档返回空数组', () => {
    expect(compose({ documents: [], layout: layoutCfg(), watermark: wmCfg() })).toEqual([]);
  });
});

describe('compose — stack 版式（fixed 类）', () => {
  it('单个身份证（front+back）放在 A4 上半部，水印随同', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg(),
      watermark: wmCfg(true)
    });
    expect(plans).toHaveLength(1);
    const [p] = plans;
    expect(p.pageSize).toEqual(A4);
    expect(p.items).toHaveLength(2);
    expect(p.items[0].wMm).toBeCloseTo(85.6, 3);
    expect(p.items[0].hMm).toBeCloseTo(54, 3);
    expect(p.items[1].wMm).toBeCloseTo(85.6, 3);
    // front 在 back 之上
    expect(p.items[0].yMm).toBeLessThan(p.items[1].yMm);
    // 水平居中
    expect(p.items[0].xMm).toBeCloseTo((A4.wMm - 85.6) / 2, 1);
    expect(p.watermark).not.toBeNull();
  });

  it('水印关闭时 PagePlan.watermark 为 null', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg(),
      watermark: wmCfg(false)
    });
    expect(plans[0].watermark).toBeNull();
  });
});

describe('compose — side 版式（fixed 类）', () => {
  it('身份证正反并排在 A4 顶部', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg({ type: 'side' }),
      watermark: wmCfg()
    });
    const [p] = plans;
    expect(p.items[0].yMm).toBeCloseTo(p.items[1].yMm, 1);  // 同高
    expect(p.items[0].xMm).toBeLessThan(p.items[1].xMm);
  });
});

describe('compose — multi 版式（fixed 类）', () => {
  it('身份证一页 3 份，PagePlan 含 6 项（3 正 + 3 反）', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg({ type: 'multi', perPage: 3 }),
      watermark: wmCfg()
    });
    expect(plans).toHaveLength(1);
    expect(plans[0].items).toHaveLength(6);
    for (const it of plans[0].items) {
      expect(it.wMm).toBeCloseTo(85.6, 3);
      expect(it.hMm).toBeCloseTo(54, 3);
    }
  });

  it('5 个身份证 perPage=3，应产出 2 页', () => {
    const docs = Array.from({ length: 5 }, (_, i) => idCardDoc('d' + i, 'f' + i, 'b' + i));
    const plans = compose({
      documents: docs,
      layout: layoutCfg({ type: 'multi', perPage: 3 }),
      watermark: wmCfg()
    });
    expect(plans).toHaveLength(2);
  });
});

describe('compose — fit 类自适应缩放', () => {
  it('营业执照(297×210) 单独放 stack，按 A4 可用宽度缩放但不超过原尺寸', () => {
    const plans = compose({
      documents: [businessDoc()],
      layout: layoutCfg(),
      watermark: wmCfg()
    });
    const it = plans[0].items[0];
    // 可用宽度 = 210 - 2*18 = 174
    expect(it.wMm).toBeCloseTo(174, 1);
    // 等比缩放：高度 = 174 * 210/297
    expect(it.hMm).toBeCloseTo(174 * 210 / 297, 1);
  });

  it('fit 类自然尺寸 < 槽位时不放大', () => {
    const tinyFit = {
      id: 't1', kind: 'other', sizeMode: 'fit',
      physicalSize: { wMm: 50, hMm: 30 },
      slots: { front: { imageId: 'i', transform: {}, filters: {} } }
    };
    const plans = compose({
      documents: [tinyFit],
      layout: layoutCfg(),
      watermark: wmCfg()
    });
    expect(plans[0].items[0].wMm).toBe(50);
    expect(plans[0].items[0].hMm).toBe(30);
  });
});

describe('compose — fixed 类放不下自动续页', () => {
  it('一张 fixed 与一张 fit 混排 stack，fit 不挤占 fixed 的物理尺寸', () => {
    const docs = [idCardDoc(), businessDoc()];
    const plans = compose({
      documents: docs,
      layout: layoutCfg(),
      watermark: wmCfg()
    });
    // 找到身份证的两个 item
    const idItems = plans.flatMap(p => p.items).filter(i => i.docId === 'd1');
    for (const it of idItems) {
      expect(it.wMm).toBeCloseTo(85.6, 3);
      expect(it.hMm).toBeCloseTo(54, 3);
    }
  });

  it('过多 fixed 项不能塞进一页时自动续页', () => {
    const docs = Array.from({ length: 4 }, (_, i) =>
      idCardDoc('d' + i, 'f' + i, 'b' + i)
    );
    const plans = compose({
      documents: docs,
      layout: layoutCfg({ type: 'multi', perPage: 1 }),
      watermark: wmCfg()
    });
    expect(plans.length).toBeGreaterThanOrEqual(1);
    // 每个 fixed item 严格 85.6×54
    for (const p of plans)
      for (const it of p.items)
        expect(it.wMm).toBeCloseTo(85.6, 3);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/layout.test.js
```

预期：FAIL，“Cannot find module ../src/layout.js”。

- [ ] **Step 3：实现 `src/layout.js`**

```js
import { A4 } from './constants.js';

// items: 拆解 documents → 平铺的渲染单元，保留 fixed/fit 标记
function flatten(documents) {
  const out = [];
  for (const d of documents) {
    for (const slotName of Object.keys(d.slots)) {
      const slot = d.slots[slotName];
      if (!slot) continue;
      out.push({
        docId: d.id,
        slot: slotName,
        kind: d.kind,
        sizeMode: d.sizeMode,
        physicalSize: d.physicalSize,
        sourceId: slot.imageId,
        transform: slot.transform,
        filters: slot.filters
      });
    }
  }
  return out;
}

function newPage(watermark) {
  return { pageSize: { ...A4 }, items: [], watermark };
}

function attachWm(watermark) {
  return watermark && watermark.enabled ? { ...watermark } : null;
}

function sizeForItem(it, availW, availH) {
  if (it.sizeMode === 'fixed') {
    return { wMm: it.physicalSize.wMm, hMm: it.physicalSize.hMm };
  }
  // fit：按可用空间等比缩放，但不超过自然尺寸
  const ratio = Math.min(availW / it.physicalSize.wMm, availH / it.physicalSize.hMm, 1);
  return {
    wMm: it.physicalSize.wMm * ratio,
    hMm: it.physicalSize.hMm * ratio
  };
}

// 把一组 sized items 在指定网格内按从上到下、从左到右放置
function placeOnPage(items, page, margin, gap = 6) {
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;
  let cursorY = margin;
  for (const it of items) {
    const x = margin + (innerW - it.wMm) / 2;
    page.items.push({
      sourceId: it.sourceId,
      docId: it.docId,
      slot: it.slot,
      transform: it.transform,
      filters: it.filters,
      xMm: x,
      yMm: cursorY,
      wMm: it.wMm,
      hMm: it.hMm
    });
    cursorY += it.hMm + gap;
    if (cursorY > margin + innerH + 0.001) {
      // 这是错误情况：page 没装下。调用方应保证
      break;
    }
  }
}

function composeStack({ flat, layout, wm }) {
  const margin = layout.margin;
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;

  const sized = flat.map(it => ({ ...it, ...sizeForItem(it, innerW, innerH) }));

  const pages = [];
  let cur = newPage(attachWm(wm));
  let used = 0;
  for (const it of sized) {
    const needed = it.hMm + (cur.items.length ? 6 : 0);
    if (used + needed > innerH && cur.items.length) {
      pages.push(cur);
      cur = newPage(attachWm(wm));
      used = 0;
    }
    cur.items.push({
      sourceId: it.sourceId, docId: it.docId, slot: it.slot,
      transform: it.transform, filters: it.filters,
      xMm: margin + (innerW - it.wMm) / 2,
      yMm: margin + used,
      wMm: it.wMm, hMm: it.hMm
    });
    used += needed;
  }
  if (cur.items.length) pages.push(cur);
  return pages;
}

function composeSide({ flat, layout, wm }) {
  // 两列布局：左列放奇数序号项，右列放偶数；每行高度 = 该行两项中较大者
  const margin = layout.margin;
  const gap = 6;
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;
  const colW = (innerW - gap) / 2;

  const sized = flat.map(it => ({ ...it, ...sizeForItem(it, colW, innerH) }));

  const pages = [];
  let cur = newPage(attachWm(wm));
  let cursorY = 0;
  for (let i = 0; i < sized.length; i += 2) {
    const left = sized[i];
    const right = sized[i + 1];
    const rowH = Math.max(left.hMm, right ? right.hMm : 0);
    if (cursorY + rowH > innerH && cur.items.length) {
      pages.push(cur);
      cur = newPage(attachWm(wm));
      cursorY = 0;
    }
    cur.items.push({
      sourceId: left.sourceId, docId: left.docId, slot: left.slot,
      transform: left.transform, filters: left.filters,
      xMm: margin + (colW - left.wMm) / 2,
      yMm: margin + cursorY,
      wMm: left.wMm, hMm: left.hMm
    });
    if (right) {
      cur.items.push({
        sourceId: right.sourceId, docId: right.docId, slot: right.slot,
        transform: right.transform, filters: right.filters,
        xMm: margin + colW + gap + (colW - right.wMm) / 2,
        yMm: margin + cursorY,
        wMm: right.wMm, hMm: right.hMm
      });
    }
    cursorY += rowH + gap;
  }
  if (cur.items.length) pages.push(cur);
  return pages;
}

function composeMulti({ flat, layout, wm }) {
  // perPage = 每页"份数"。一份 = 同一 docId 的所有 slot。
  const perPage = Math.max(1, layout.perPage | 0);
  const margin = layout.margin;
  const gap = 6;
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;

  // 按 doc 分组，保留 doc 顺序
  const byDoc = [];
  const seen = new Map();
  for (const it of flat) {
    if (!seen.has(it.docId)) {
      seen.set(it.docId, byDoc.length);
      byDoc.push([]);
    }
    byDoc[seen.get(it.docId)].push(it);
  }

  const pages = [];
  for (let i = 0; i < byDoc.length; i += perPage) {
    const chunk = byDoc.slice(i, i + perPage);
    const cur = newPage(attachWm(wm));
    const rowH = (innerH - gap * (chunk.length - 1)) / chunk.length;
    chunk.forEach((docItems, rowIdx) => {
      const rowY = margin + rowIdx * (rowH + gap);
      // 同 doc 的 slot 横向排开
      const slotW = (innerW - gap * (docItems.length - 1)) / docItems.length;
      docItems.forEach((it, colIdx) => {
        const { wMm, hMm } = sizeForItem(it, slotW, rowH);
        const slotX = margin + colIdx * (slotW + gap);
        cur.items.push({
          sourceId: it.sourceId, docId: it.docId, slot: it.slot,
          transform: it.transform, filters: it.filters,
          xMm: slotX + (slotW - wMm) / 2,
          yMm: rowY + (rowH - hMm) / 2,
          wMm, hMm
        });
      });
    });
    pages.push(cur);
  }
  return pages;
}

export function compose({ documents, layout, watermark }) {
  if (!documents || documents.length === 0) return [];
  const flat = flatten(documents);
  if (flat.length === 0) return [];
  switch (layout.type) {
    case 'side':  return composeSide({ flat, layout, wm: watermark });
    case 'multi': return composeMulti({ flat, layout, wm: watermark });
    case 'stack':
    default:      return composeStack({ flat, layout, wm: watermark });
  }
}
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
npx vitest run tests/layout.test.js
```

预期：全部 PASS。如有失败，按错误信息回到 step 3 修复。

- [ ] **Step 5：提交**

```bash
git add src/layout.js tests/layout.test.js
git commit -m "feat(layout): compose() emitting mm-based PagePlan[] for stack/side/multi"
```

---

### Task 6：水印渲染器 `watermark.js`

`drawTo(ctx, config, pageSizeMm, mmPerPx, dateNow)`，对角平铺，支持 `{project}` 与 `{date}` 占位符。

**Files:**
- Create: `src/watermark.js`
- Create: `tests/watermark.test.js`

- [ ] **Step 1：写测试 `tests/watermark.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveText, drawTo } from '../src/watermark.js';
import { DEFAULT_WATERMARK } from '../src/constants.js';

describe('resolveText — 占位符替换', () => {
  it('替换 {project} 与 {date}', () => {
    const text = resolveText(
      { ...DEFAULT_WATERMARK, project: 'XYZ', includeDate: true },
      new Date('2026-06-12T00:00:00')
    );
    expect(text).toBe('仅供XYZ投标使用 2026-06-12');
  });

  it('includeDate=false 时不出现日期', () => {
    const text = resolveText(
      { ...DEFAULT_WATERMARK, text: '仅供{project}使用 {date}', project: 'X', includeDate: false },
      new Date('2026-06-12')
    );
    expect(text).toBe('仅供X使用 ');
  });

  it('文本截断到 200 字', () => {
    const text = resolveText(
      { ...DEFAULT_WATERMARK, text: 'A'.repeat(500), project: '', includeDate: false },
      new Date('2026-06-12')
    );
    expect(text.length).toBeLessThanOrEqual(200);
  });
});

describe('drawTo — Canvas 调用', () => {
  let ctx;
  beforeEach(() => {
    ctx = {
      save: vi.fn(), restore: vi.fn(),
      translate: vi.fn(), rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      set globalAlpha(v) { this._alpha = v; }, get globalAlpha() { return this._alpha; },
      set fillStyle(v) { this._fill = v; }, get fillStyle() { return this._fill; },
      set font(v) { this._font = v; }, get font() { return this._font; },
      set textBaseline(v) { this._tb = v; }, get textBaseline() { return this._tb; }
    };
  });

  it('绘制时设置颜色、透明度、字号', () => {
    drawTo(ctx, DEFAULT_WATERMARK, { wMm: 210, hMm: 297 }, 3.78, new Date('2026-06-12'));
    expect(ctx._fill).toBe(DEFAULT_WATERMARK.color);
    expect(ctx._alpha).toBeCloseTo(DEFAULT_WATERMARK.opacity);
    expect(ctx._font).toMatch(/14/);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('对角平铺至少绘制 5 次以上文字', () => {
    drawTo(ctx, DEFAULT_WATERMARK, { wMm: 210, hMm: 297 }, 3.78, new Date('2026-06-12'));
    expect(ctx.fillText.mock.calls.length).toBeGreaterThan(5);
  });

  it('opacity / fontSize 越界自动夹紧', () => {
    const cfg = { ...DEFAULT_WATERMARK, opacity: 5, fontSize: 999 };
    drawTo(ctx, cfg, { wMm: 210, hMm: 297 }, 3.78, new Date('2026-06-12'));
    expect(ctx._alpha).toBeLessThanOrEqual(1);
    expect(parseInt(ctx._font, 10)).toBeLessThanOrEqual(200);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/watermark.test.js
```

预期：FAIL，“Cannot find module ../src/watermark.js”。

- [ ] **Step 3：实现 `src/watermark.js`**

```js
const MAX_TEXT = 200;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};

export function resolveText(config, dateNow = new Date()) {
  const date = config.includeDate ? fmtDate(dateNow) : '';
  const project = config.project || '';
  const raw = String(config.text || '')
    .replaceAll('{project}', project)
    .replaceAll('{date}', date);
  return raw.slice(0, MAX_TEXT);
}

export function drawTo(ctx, config, pageSizeMm, mmPerPx, dateNow = new Date()) {
  const text = resolveText(config, dateNow);
  if (!text) return;

  const opacity  = clamp(Number(config.opacity)  || 0,   0, 1);
  const fontSize = clamp(Number(config.fontSize) || 12,  6, 200);
  const angle    = clamp(Number(config.angleDeg) || 0, -90, 90);
  const gapX     = clamp(Number(config.gapX)     || 80, 20, 800);
  const gapY     = clamp(Number(config.gapY)     || 60, 20, 800);

  const pageWpx = pageSizeMm.wMm * mmPerPx;
  const pageHpx = pageSizeMm.hMm * mmPerPx;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = config.color || '#dc2626';
  ctx.font = `600 ${fontSize}px -apple-system, "Helvetica Neue", "PingFang SC", sans-serif`;
  ctx.textBaseline = 'middle';

  ctx.translate(pageWpx / 2, pageHpx / 2);
  ctx.rotate(angle * Math.PI / 180);

  const diag = Math.hypot(pageWpx, pageHpx);
  const halfDiag = diag / 2;
  const textWidth = ctx.measureText(text).width;

  for (let y = -halfDiag; y <= halfDiag; y += gapY) {
    for (let x = -halfDiag - textWidth; x <= halfDiag; x += gapX + textWidth) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run tests/watermark.test.js
```

预期：全部 PASS。

- [ ] **Step 5：提交**

```bash
git add src/watermark.js tests/watermark.test.js
git commit -m "feat(watermark): diagonal tile drawTo() with {project}/{date} placeholders"
```

---

### Task 7：模板 schema `templateSchema.js`

**Files:**
- Create: `src/templateSchema.js`
- Create: `tests/templateSchema.test.js`

- [ ] **Step 1：写测试 `tests/templateSchema.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { sanitizeTemplate } from '../src/templateSchema.js';

const validRaw = {
  name: '我的项目',
  watermark: {
    enabled: true, text: '仅供X使用', project: 'X', color: '#dc2626',
    opacity: 0.3, fontSize: 14, angleDeg: -30, gapX: 140, gapY: 90, includeDate: true
  },
  layout: { type: 'stack', perPage: 1, margin: 18 },
  filters: { grayscale: false, brightness: 1, contrast: 1 }
};

describe('sanitizeTemplate', () => {
  it('完全合法的模板原样保留', () => {
    const out = sanitizeTemplate(validRaw);
    expect(out.name).toBe('我的项目');
    expect(out.watermark.color).toBe('#dc2626');
    expect(out.layout.type).toBe('stack');
  });

  it('丢弃未知顶层字段', () => {
    const out = sanitizeTemplate({ ...validRaw, evil: 'x', __proto__: { y: 1 } });
    expect('evil' in out).toBe(false);
  });

  it('丢弃 watermark 中未知字段', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, eval: 'bad', imageId: 'leak' }
    });
    expect('eval' in out.watermark).toBe(false);
    expect('imageId' in out.watermark).toBe(false);
  });

  it('非法颜色回退默认', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, color: 'red; <script>' }
    });
    expect(out.watermark.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('opacity 越界夹紧到 [0,1]', () => {
    const out1 = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, opacity: 5 }
    });
    expect(out1.watermark.opacity).toBeLessThanOrEqual(1);
    const out2 = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, opacity: -1 }
    });
    expect(out2.watermark.opacity).toBeGreaterThanOrEqual(0);
  });

  it('layout.type 不在白名单时回退到 stack', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      layout: { ...validRaw.layout, type: 'evil' }
    });
    expect(out.layout.type).toBe('stack');
  });

  it('文本超过 200 字截断', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, text: 'A'.repeat(500) }
    });
    expect(out.watermark.text.length).toBeLessThanOrEqual(200);
  });

  it('完全空对象返回带默认值的模板', () => {
    const out = sanitizeTemplate({});
    expect(out.name).toBe('未命名');
    expect(out.watermark.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(out.layout.type).toBe('stack');
  });

  it('非对象输入返回 null', () => {
    expect(sanitizeTemplate(null)).toBeNull();
    expect(sanitizeTemplate('x')).toBeNull();
    expect(sanitizeTemplate(123)).toBeNull();
    expect(sanitizeTemplate([])).toBeNull();
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/templateSchema.test.js
```

预期：FAIL。

- [ ] **Step 3：实现 `src/templateSchema.js`**

```js
import { DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS } from './constants.js';

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const LAYOUT_TYPES = new Set(['stack', 'side', 'multi']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));
const okStr = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

function bool(v, def) { return typeof v === 'boolean' ? v : def; }
function num(v, def, lo, hi) {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, lo, hi) : def;
}
function color(v) {
  return typeof v === 'string' && COLOR_RE.test(v) ? v : DEFAULT_WATERMARK.color;
}

function cleanWatermark(raw = {}) {
  return {
    enabled:     bool(raw.enabled, DEFAULT_WATERMARK.enabled),
    text:        okStr(raw.text || DEFAULT_WATERMARK.text, 200),
    project:     okStr(raw.project || DEFAULT_WATERMARK.project, 80),
    color:       color(raw.color),
    opacity:     num(raw.opacity,  DEFAULT_WATERMARK.opacity,  0,   1),
    fontSize:    num(raw.fontSize, DEFAULT_WATERMARK.fontSize, 6,   200),
    angleDeg:    num(raw.angleDeg, DEFAULT_WATERMARK.angleDeg, -90, 90),
    gapX:        num(raw.gapX,     DEFAULT_WATERMARK.gapX,     20,  800),
    gapY:        num(raw.gapY,     DEFAULT_WATERMARK.gapY,     20,  800),
    includeDate: bool(raw.includeDate, DEFAULT_WATERMARK.includeDate)
  };
}

function cleanLayout(raw = {}) {
  const type = LAYOUT_TYPES.has(raw.type) ? raw.type : DEFAULT_LAYOUT.type;
  return {
    type,
    perPage: num(raw.perPage, DEFAULT_LAYOUT.perPage, 1, 12),
    margin:  num(raw.margin,  DEFAULT_LAYOUT.margin,  0, 50)
  };
}

function cleanFilters(raw = {}) {
  return {
    grayscale:  bool(raw.grayscale, DEFAULT_FILTERS.grayscale),
    brightness: num(raw.brightness, DEFAULT_FILTERS.brightness, 0.5, 1.5),
    contrast:   num(raw.contrast,   DEFAULT_FILTERS.contrast,   0.5, 1.5)
  };
}

export function sanitizeTemplate(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return {
    name:      okStr(raw.name, 60) || '未命名',
    watermark: cleanWatermark(raw.watermark),
    layout:    cleanLayout(raw.layout),
    filters:   cleanFilters(raw.filters)
  };
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run tests/templateSchema.test.js
```

预期：全部 PASS。

- [ ] **Step 5：提交**

```bash
git add src/templateSchema.js tests/templateSchema.test.js
git commit -m "feat(templateSchema): whitelist + clamp sanitizer for template JSON"
```

---

## Phase 2：浏览器侧模块（多以人工验证，少量单测）

### Task 8：图片仓库 `imageStore.js`

Object URL 生命周期管理 + ImageBitmap 缓存。

**Files:**
- Create: `src/imageStore.js`
- Create: `tests/imageStore.test.js`

- [ ] **Step 1：写测试 `tests/imageStore.test.js`**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createImageStore } from '../src/imageStore.js';

const fakeBlob = (name = 'a.png') =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

beforeEach(() => {
  let n = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:fake-${++n}`);
  globalThis.URL.revokeObjectURL = vi.fn();
  globalThis.createImageBitmap = vi.fn(async () => ({
    width: 100, height: 60, close: vi.fn()
  }));
});

describe('createImageStore', () => {
  it('add 返回 id 和 bitmap', async () => {
    const store = createImageStore();
    const entry = await store.add(fakeBlob());
    expect(entry.id).toMatch(/^img_/);
    expect(entry.naturalWidth).toBe(100);
    expect(entry.naturalHeight).toBe(60);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('get 返回先前 add 的条目', async () => {
    const store = createImageStore();
    const { id } = await store.add(fakeBlob());
    expect(store.get(id)).not.toBeNull();
  });

  it('remove 释放 ObjectURL 并关闭 bitmap', async () => {
    const store = createImageStore();
    const { id } = await store.add(fakeBlob());
    store.remove(id);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    expect(store.get(id)).toBeNull();
  });

  it('clear 释放所有', async () => {
    const store = createImageStore();
    await store.add(fakeBlob('a'));
    await store.add(fakeBlob('b'));
    store.clear();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('add 非 image/* 文件抛错', async () => {
    const store = createImageStore();
    const txt = new File(['hi'], 'a.txt', { type: 'text/plain' });
    await expect(store.add(txt)).rejects.toThrow(/请选择图片文件/);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/imageStore.test.js
```

- [ ] **Step 3：实现 `src/imageStore.js`**

```js
const OK_MIME = /^image\/(jpeg|png|webp|heic|heif)$/i;
const MAX_PX = 4000;

let _seq = 0;
const nextId = () => `img_${++_seq}`;

async function loadBitmap(file) {
  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch (e) {
    throw new Error('浏览器无法解码该图片（HEIC 等格式请先转 JPG/PNG）');
  }
  // 超大图按 MAX_PX 降采样
  if (bmp.width > MAX_PX || bmp.height > MAX_PX) {
    const ratio = MAX_PX / Math.max(bmp.width, bmp.height);
    const targetW = Math.round(bmp.width * ratio);
    const targetH = Math.round(bmp.height * ratio);
    const resized = await createImageBitmap(bmp, {
      resizeWidth: targetW, resizeHeight: targetH, resizeQuality: 'high'
    });
    bmp.close && bmp.close();
    return { bitmap: resized, naturalWidth: targetW, naturalHeight: targetH };
  }
  return { bitmap: bmp, naturalWidth: bmp.width, naturalHeight: bmp.height };
}

export function createImageStore() {
  const map = new Map();   // id → { id, url, bitmap, naturalWidth, naturalHeight }

  async function add(file) {
    if (!file || !OK_MIME.test(file.type)) {
      throw new Error('请选择图片文件（JPG / PNG / WebP / HEIC）');
    }
    const { bitmap, naturalWidth, naturalHeight } = await loadBitmap(file);
    const id = nextId();
    const url = URL.createObjectURL(file);
    const entry = { id, url, bitmap, naturalWidth, naturalHeight };
    map.set(id, entry);
    return entry;
  }

  function get(id) { return map.get(id) || null; }

  function remove(id) {
    const e = map.get(id);
    if (!e) return;
    URL.revokeObjectURL(e.url);
    e.bitmap.close && e.bitmap.close();
    map.delete(id);
  }

  function clear() {
    for (const id of [...map.keys()]) remove(id);
  }

  return { add, get, remove, clear };
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run tests/imageStore.test.js
```

- [ ] **Step 5：提交**

```bash
git add src/imageStore.js tests/imageStore.test.js
git commit -m "feat(imageStore): session-only ImageBitmap pool with ObjectURL lifecycle"
```

---

### Task 9：上传 `upload.js`

绑定一个 DOM 元素，监听 click / drop / paste 三种来源，把每个 File 通过 `onFile` 回调上送。

**Files:**
- Create: `src/upload.js`

- [ ] **Step 1：实现 `src/upload.js`**

```js
// bindUploadZone(el, { onFile, accept = 'image/*', multiple = true }) → { destroy() }
export function bindUploadZone(el, { onFile, accept = 'image/*', multiple = true }) {
  if (!el || typeof onFile !== 'function') {
    throw new Error('bindUploadZone: el 与 onFile 必填');
  }

  // 隐藏的 <input type="file">，由 el 的 click 触发
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = accept;
  fileInput.multiple = multiple;
  fileInput.style.display = 'none';
  el.appendChild(fileInput);

  function emit(files) {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      Promise.resolve(onFile(f)).catch(err => alertOnce(err.message));
    }
  }

  function onClick() { fileInput.click(); }
  function onFileInput() {
    emit(fileInput.files);
    fileInput.value = '';
  }
  function onDragOver(e) {
    e.preventDefault();
    el.classList.add('is-dragging');
  }
  function onDragLeave() { el.classList.remove('is-dragging'); }
  function onDrop(e) {
    e.preventDefault();
    el.classList.remove('is-dragging');
    if (e.dataTransfer && e.dataTransfer.files) emit(e.dataTransfer.files);
  }
  function onPaste(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const files = [];
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) emit(files);
  }

  el.addEventListener('click', onClick);
  fileInput.addEventListener('change', onFileInput);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);
  window.addEventListener('paste', onPaste);

  return {
    destroy() {
      el.removeEventListener('click', onClick);
      fileInput.removeEventListener('change', onFileInput);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
      fileInput.remove();
    }
  };
}

let _alerted = '';
function alertOnce(msg) {
  if (msg === _alerted) return;
  _alerted = msg;
  setTimeout(() => (_alerted = ''), 2000);
  alert(msg);
}
```

- [ ] **Step 2：人工验证（推迟到 UI 任务后）**

不写单测：依赖 DOM 事件与剪贴板，单测成本高、覆盖率低。最终在 Task 14 浏览器手测中验证。

- [ ] **Step 3：提交**

```bash
git add src/upload.js
git commit -m "feat(upload): click/drag/paste binding emitting File via callback"
```

---

### Task 10：渲染器 `renderer.js`

输入 PagePlan 与图片获取函数，输出一个 Canvas，包含所有 item + 水印 + filters。

**Files:**
- Create: `src/renderer.js`

- [ ] **Step 1：实现 `src/renderer.js`**

```js
import { drawTo as drawWatermark } from './watermark.js';

// renderPage(plan, { mmPerPx, imageGetter, globalFilters, dateNow }) → HTMLCanvasElement
export function renderPage(plan, { mmPerPx, imageGetter, globalFilters = null, dateNow = new Date() }) {
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(plan.pageSize.wMm * mmPerPx);
  canvas.height = Math.round(plan.pageSize.hMm * mmPerPx);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // 纸张底色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const item of plan.items) {
    drawItem(ctx, item, imageGetter, mmPerPx, globalFilters);
  }

  if (plan.watermark) {
    drawWatermark(ctx, plan.watermark, plan.pageSize, mmPerPx, dateNow);
  }

  return canvas;
}

function drawItem(ctx, item, imageGetter, mmPerPx, globalFilters) {
  const entry = imageGetter(item.sourceId);
  if (!entry || !entry.bitmap) {
    // 占位框，便于发现丢失资源
    ctx.save();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(item.xMm * mmPerPx, item.yMm * mmPerPx, item.wMm * mmPerPx, item.hMm * mmPerPx);
    ctx.restore();
    return;
  }

  const dx = item.xMm * mmPerPx;
  const dy = item.yMm * mmPerPx;
  const dw = item.wMm * mmPerPx;
  const dh = item.hMm * mmPerPx;

  const t = { scale: 1, rotateDeg: 0, offsetX: 0, offsetY: 0, cropRect: null, ...item.transform };
  const fLocal = { brightness: 1, contrast: 1, grayscale: false, ...item.filters };
  const f = {
    brightness: fLocal.brightness * (globalFilters?.brightness ?? 1),
    contrast:   fLocal.contrast   * (globalFilters?.contrast   ?? 1),
    grayscale:  fLocal.grayscale || (globalFilters?.grayscale ?? false)
  };

  // 源裁剪
  const src = t.cropRect
    ? { x: t.cropRect.x, y: t.cropRect.y, w: t.cropRect.w, h: t.cropRect.h }
    : { x: 0, y: 0, w: entry.naturalWidth, h: entry.naturalHeight };

  ctx.save();
  // 限制绘制范围到目标矩形（避免旋转后越界覆盖其他 item）
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();

  // 应用 filter（CSS filter on Canvas — Chrome/Edge/Safari/Firefox 都支持）
  const filterParts = [];
  if (f.brightness !== 1) filterParts.push(`brightness(${f.brightness})`);
  if (f.contrast   !== 1) filterParts.push(`contrast(${f.contrast})`);
  if (f.grayscale)        filterParts.push('grayscale(1)');
  ctx.filter = filterParts.length ? filterParts.join(' ') : 'none';

  // 平移到目标中心，旋转，绘制
  ctx.translate(dx + dw / 2 + t.offsetX, dy + dh / 2 + t.offsetY);
  ctx.rotate((t.rotateDeg || 0) * Math.PI / 180);
  ctx.scale(t.scale || 1, t.scale || 1);

  ctx.drawImage(
    entry.bitmap,
    src.x, src.y, src.w, src.h,
    -dw / 2, -dh / 2, dw, dh
  );

  ctx.restore();
}
```

- [ ] **Step 2：人工验证延后到 Task 17（预览面板）**

依赖 Canvas 与真实图片，单测受限。

- [ ] **Step 3：提交**

```bash
git add src/renderer.js
git commit -m "feat(renderer): PagePlan → Canvas with transform, filters, watermark"
```

---

### Task 11：裁剪交互 `cropper.js`

挂载到一个 `<canvas>` 上，渲染当前 slot 的图像 + 可拖角点的裁剪框 + 旋转 / 滚轮缩放 / 亮度对比度滑块外部触发。

**Files:**
- Create: `src/cropper.js`

- [ ] **Step 1：实现 `src/cropper.js`**

```js
// mountCropper({
//   canvas,           // HTMLCanvasElement
//   getEntry,         // () → imageStore entry or null
//   getTransform,     // () → transform
//   onTransformChange // (patch) => void
// }) → { redraw(), destroy() }
//
// 交互：
//   - 拖拽画布：平移图像（更新 transform.offsetX/Y）
//   - 滚轮：缩放（更新 transform.scale）
//   - 拖动 4 个角点：调整 transform.cropRect（源图坐标系）
//   - 旋转、滤镜由外部按钮控制并通过 onTransformChange 触发 redraw

const HANDLE = 10;

export function mountCropper({ canvas, getEntry, getTransform, onTransformChange }) {
  const ctx = canvas.getContext('2d');
  let dragging = null;     // 'move' | { handle: 'tl'|'tr'|'bl'|'br' }
  let lastPt = null;

  function viewSize() { return { w: canvas.clientWidth, h: canvas.clientHeight }; }
  function syncBackingStore() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function imageDisplayRect() {
    // 把源图按 "contain" 适配到画布；transform.scale/offset 在此基础上叠加
    const entry = getEntry();
    if (!entry) return null;
    const { w: vw, h: vh } = viewSize();
    const ratio = Math.min(vw / entry.naturalWidth, vh / entry.naturalHeight);
    const w = entry.naturalWidth * ratio;
    const h = entry.naturalHeight * ratio;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;
    return { x, y, w, h, ratio };
  }

  function redraw() {
    syncBackingStore();
    const { w: vw, h: vh } = viewSize();
    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, vw, vh);

    const entry = getEntry();
    if (!entry) return;
    const t = getTransform();
    const base = imageDisplayRect();
    if (!base) return;

    ctx.save();
    const cx = base.x + base.w / 2 + (t.offsetX || 0);
    const cy = base.y + base.h / 2 + (t.offsetY || 0);
    ctx.translate(cx, cy);
    ctx.rotate((t.rotateDeg || 0) * Math.PI / 180);
    ctx.scale(t.scale || 1, t.scale || 1);
    ctx.drawImage(entry.bitmap, -base.w / 2, -base.h / 2, base.w, base.h);
    ctx.restore();

    if (t.cropRect) drawCropFrame(t.cropRect, base);
  }

  function drawCropFrame(crop, base) {
    const { ratio } = base;
    const x = base.x + crop.x * ratio;
    const y = base.y + crop.y * ratio;
    const w = crop.w * ratio;
    const h = crop.h * ratio;

    // 半透明遮罩 + 中间镂空
    const { w: vw, h: vh } = viewSize();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.clearRect(x, y, w, h);

    // 边框 + 4 角
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE);
    }
    ctx.restore();
  }

  function hitHandle(px, py) {
    const t = getTransform();
    if (!t.cropRect) return null;
    const base = imageDisplayRect();
    if (!base) return null;
    const { ratio } = base;
    const x = base.x + t.cropRect.x * ratio;
    const y = base.y + t.cropRect.y * ratio;
    const w = t.cropRect.w * ratio;
    const h = t.cropRect.h * ratio;
    const corners = { tl: [x, y], tr: [x + w, y], bl: [x, y + h], br: [x + w, y + h] };
    for (const [name, [hx, hy]] of Object.entries(corners)) {
      if (Math.abs(px - hx) < HANDLE && Math.abs(py - hy) < HANDLE) return name;
    }
    return null;
  }

  function ptFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    const p = ptFromEvent(e);
    const handle = hitHandle(p.x, p.y);
    dragging = handle ? { handle } : 'move';
    lastPt = p;
    canvas.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!dragging) return;
    const p = ptFromEvent(e);
    const dx = p.x - lastPt.x;
    const dy = p.y - lastPt.y;
    lastPt = p;

    if (dragging === 'move') {
      const t = getTransform();
      onTransformChange({ offsetX: (t.offsetX || 0) + dx, offsetY: (t.offsetY || 0) + dy });
    } else {
      const t = getTransform();
      const base = imageDisplayRect();
      if (!t.cropRect || !base) return;
      const r = { ...t.cropRect };
      const sx = dx / base.ratio;
      const sy = dy / base.ratio;
      switch (dragging.handle) {
        case 'tl': r.x += sx; r.y += sy; r.w -= sx; r.h -= sy; break;
        case 'tr': r.y += sy; r.w += sx; r.h -= sy; break;
        case 'bl': r.x += sx; r.w -= sx; r.h += sy; break;
        case 'br': r.w += sx; r.h += sy; break;
      }
      r.w = Math.max(20, r.w);
      r.h = Math.max(20, r.h);
      onTransformChange({ cropRect: r });
    }
  }
  function onUp(e) {
    dragging = null;
    lastPt = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  function onWheel(e) {
    e.preventDefault();
    const t = getTransform();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    const next = Math.max(0.2, Math.min(8, (t.scale || 1) * factor));
    onTransformChange({ scale: next });
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    redraw,
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    }
  };
}
```

- [ ] **Step 2：提交**

```bash
git add src/cropper.js
git commit -m "feat(cropper): pointer-based pan/zoom + corner-handle crop frame"
```

---

### Task 12：导出器 `exporter.js`

按 PagePlan 列表渲染高分辨率 Canvas，分别输出 PNG / JPG / 多页 PDF 或调起打印。

**Files:**
- Create: `src/exporter.js`
- Modify: `src/main.js`（暴露给 selftest 用）

- [ ] **Step 1：实现 `src/exporter.js`**

```js
import { renderPage } from './renderer.js';
import { MM_PER_PT } from './constants.js';

// pdf-lib 在浏览器中作为 window.PDFLib（UMD），构建脚本会内联
const getPDFLib = () => {
  if (typeof window !== 'undefined' && window.PDFLib) return window.PDFLib;
  throw new Error('pdf-lib 未加载');
};

function dpiToMmPerPx(dpi) {
  return dpi / 25.4;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function toPng({ plans, imageGetter, dpi = 300, filename = 'id-copy.png' }) {
  if (!plans.length) throw new Error('请至少添加一张证件图');
  const mmPerPx = dpiToMmPerPx(dpi);
  // 多页 PNG：纵向拼接成一张大图
  const canvases = plans.map(p => renderPage(p, { mmPerPx, imageGetter }));
  const totalH = canvases.reduce((s, c) => s + c.height, 0);
  const w = canvases[0].width;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = totalH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, w, totalH);
  let y = 0;
  for (const c of canvases) {
    octx.drawImage(c, 0, y);
    y += c.height;
  }
  const blob = await new Promise(res => out.toBlob(res, 'image/png'));
  downloadBlob(blob, filename);
}

export async function toJpg({ plans, imageGetter, dpi = 300, quality = 0.92, filename = 'id-copy.jpg' }) {
  if (!plans.length) throw new Error('请至少添加一张证件图');
  const mmPerPx = dpiToMmPerPx(dpi);
  const canvases = plans.map(p => renderPage(p, { mmPerPx, imageGetter }));
  const totalH = canvases.reduce((s, c) => s + c.height, 0);
  const w = canvases[0].width;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = totalH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, w, totalH);
  let y = 0;
  for (const c of canvases) { octx.drawImage(c, 0, y); y += c.height; }
  const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', quality));
  downloadBlob(blob, filename);
}

export async function toPdf({ plans, imageGetter, dpi = 300, filename = 'id-copy.pdf' }) {
  if (!plans.length) throw new Error('请至少添加一张证件图');
  const { PDFDocument } = getPDFLib();
  const mmPerPx = dpiToMmPerPx(dpi);

  const pdfDoc = await PDFDocument.create();
  for (const plan of plans) {
    const canvas = renderPage(plan, { mmPerPx, imageGetter });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const jpgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
    const img = await pdfDoc.embedJpg(jpgBytes);

    const pageW = plan.pageSize.wMm / MM_PER_PT;  // mm → pt
    const pageH = plan.pageSize.hMm / MM_PER_PT;
    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
  }
  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}

// 调起系统打印对话框：把所有页面以 mm 为单位插入一个临时 iframe，应用 @page A4。
// 注意：fetch(dataUrl) 与 connect-src 'none' 冲突 — 改用 canvas.toBlob + FileReader 路径
// （上面 toPdf 的 dataUrl→arrayBuffer 也需要规避，见 Step 2）。
export function printPlans({ plans, imageGetter, dpi = 200 }) {
  if (!plans.length) {
    alert('请至少添加一张证件图');
    return;
  }
  const mmPerPx = dpiToMmPerPx(dpi);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .page { width: 210mm; height: 297mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { display: block; width: 210mm; height: 297mm; }
  </style></head><body></body></html>`);
  doc.close();

  for (const plan of plans) {
    const canvas = renderPage(plan, { mmPerPx, imageGetter });
    const div = doc.createElement('div');
    div.className = 'page';
    const img = doc.createElement('img');
    img.src = canvas.toDataURL('image/png');
    div.appendChild(img);
    doc.body.appendChild(div);
  }

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 200);
}
```

- [ ] **Step 2：修正 PDF 字节读取（避免 fetch+CSP 冲突）**

把 `toPdf` 中 `await fetch(dataUrl).then(r => r.arrayBuffer())` 替换为 Blob 路径，因为 `connect-src 'none'` 会阻止 `fetch('blob:')` 与 `fetch('data:')`：

```js
// 替换 toPdf 内部的 JPG 字节读取：
async function canvasToJpgBytes(canvas, quality = 0.92) {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
  return new Uint8Array(await blob.arrayBuffer());
}
```

然后将 `toPdf` 中的两行：

```js
const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
const jpgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
```

替换为：

```js
const jpgBytes = await canvasToJpgBytes(canvas, 0.92);
```

把 `canvasToJpgBytes` 提到模块顶部。

- [ ] **Step 3：提交**

```bash
git add src/exporter.js
git commit -m "feat(exporter): PNG/JPG/PDF/print using PagePlan and pdf-lib (CSP-safe)"
```

---

### Task 13：模板服务 `templates.js`

LocalStorage 持久化 + 导入导出 JSON。

**Files:**
- Create: `src/templates.js`
- Create: `tests/templates.test.js`

- [ ] **Step 1：写测试 `tests/templates.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createTemplateService } from '../src/templates.js';

const validJson = JSON.stringify({
  name: 'X',
  watermark: { color: '#112233', opacity: 0.5, fontSize: 16,
               angleDeg: -20, gapX: 100, gapY: 60, includeDate: true,
               text: 'A', project: 'B', enabled: true },
  layout: { type: 'side', perPage: 1, margin: 12 },
  filters: { grayscale: true, brightness: 1, contrast: 1 }
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('createTemplateService', () => {
  it('list() 初始为空', () => {
    const svc = createTemplateService();
    expect(svc.list()).toEqual([]);
  });

  it('save() → list() 包含新模板，每个有 id', () => {
    const svc = createTemplateService();
    const saved = svc.save({ name: '新模板', watermark: {}, layout: {}, filters: {} });
    expect(saved.id).toMatch(/^tpl_/);
    expect(svc.list()).toHaveLength(1);
  });

  it('save(同 id) 覆盖', () => {
    const svc = createTemplateService();
    const a = svc.save({ name: 'A', watermark: {}, layout: {}, filters: {} });
    svc.save({ id: a.id, name: 'A2', watermark: {}, layout: {}, filters: {} });
    expect(svc.list()).toHaveLength(1);
    expect(svc.list()[0].name).toBe('A2');
  });

  it('remove()', () => {
    const svc = createTemplateService();
    const a = svc.save({ name: 'A', watermark: {}, layout: {}, filters: {} });
    svc.remove(a.id);
    expect(svc.list()).toEqual([]);
  });

  it('exportJson 返回包含 sanitize 后字段', () => {
    const svc = createTemplateService();
    const a = svc.save({ name: 'A', watermark: { color: 'bad' }, layout: {}, filters: {} });
    const text = svc.exportJson(a.id);
    const parsed = JSON.parse(text);
    expect(parsed.watermark.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('importJson 接收合法 JSON 并保存', () => {
    const svc = createTemplateService();
    const t = svc.importJson(validJson);
    expect(t.watermark.color).toBe('#112233');
    expect(svc.list()).toHaveLength(1);
  });

  it('importJson 非对象 / 非法 JSON 抛错', () => {
    const svc = createTemplateService();
    expect(() => svc.importJson('not json {')).toThrow();
    expect(() => svc.importJson('"hi"')).toThrow();
  });

  it('localStorage 写失败时降级（不抛错）', () => {
    const svc = createTemplateService();
    const orig = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('quota'); };
    expect(() => svc.save({ name: 'X', watermark: {}, layout: {}, filters: {} })).not.toThrow();
    globalThis.localStorage.setItem = orig;
  });

  it('模板列表里不应出现 imageId（防泄漏）', () => {
    const svc = createTemplateService();
    svc.save({ name: 'A', watermark: { imageId: 'leak' }, layout: {}, filters: {} });
    const t = svc.list()[0];
    expect('imageId' in t.watermark).toBe(false);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run tests/templates.test.js
```

- [ ] **Step 3：实现 `src/templates.js`**

```js
import { sanitizeTemplate } from './templateSchema.js';

const KEY = 'id-copy-tool.templates.v1';
let _seq = 0;
const nextId = () => `tpl_${Date.now().toString(36)}_${++_seq}`;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map(x => {
        const clean = sanitizeTemplate(x);
        if (!clean) return null;
        return { id: typeof x?.id === 'string' ? x.id : nextId(), ...clean };
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (_) {
    return false;
  }
}

export function createTemplateService() {
  let cache = readAll();

  function list() { return cache.slice(); }

  function save(t) {
    const clean = sanitizeTemplate(t);
    if (!clean) throw new Error('模板格式不合法');
    const id = (t && typeof t.id === 'string') ? t.id : nextId();
    const entry = { id, ...clean };
    cache = cache.filter(x => x.id !== id).concat(entry);
    writeAll(cache);
    return entry;
  }

  function remove(id) {
    const before = cache.length;
    cache = cache.filter(x => x.id !== id);
    if (cache.length !== before) writeAll(cache);
    return cache.length !== before;
  }

  function exportJson(id) {
    const t = cache.find(x => x.id === id);
    if (!t) throw new Error('未找到模板');
    const { id: _ignore, ...payload } = t;
    return JSON.stringify(payload, null, 2);
  }

  function importJson(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { throw new Error('JSON 解析失败'); }
    const clean = sanitizeTemplate(parsed);
    if (!clean) throw new Error('模板内容不合法');
    return save(clean);
  }

  function refresh() { cache = readAll(); return cache.slice(); }

  return { list, save, remove, exportJson, importJson, refresh };
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run tests/templates.test.js
```

- [ ] **Step 5：提交**

```bash
git add src/templates.js tests/templates.test.js
git commit -m "feat(templates): LocalStorage CRUD + import/export with schema sanitization"
```

---

## Phase 3：UI 与样式

### Task 14：三栏布局样式 `styles.css`

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1：替换 `src/styles.css` 为完整样式**

```css
:root {
  --bg: #f4f4f5;
  --panel: #ffffff;
  --border: #d4d4d8;
  --text: #18181b;
  --muted: #71717a;
  --brand: #dc2626;
  --accent: #2563eb;
  --radius: 6px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body {
  font-family: -apple-system, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
}
button {
  font: inherit; color: inherit;
  background: #fff; border: 1px solid var(--border);
  border-radius: var(--radius); padding: 6px 10px; cursor: pointer;
}
button:hover { background: #fafafa; }
button:disabled { color: #a1a1aa; cursor: not-allowed; background: #f4f4f5; }
button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
button.primary:hover { background: #1d4ed8; }
input[type="text"], input[type="number"], select, textarea {
  font: inherit; padding: 4px 6px; border: 1px solid var(--border);
  border-radius: var(--radius); background: #fff; width: 100%;
}
input[type="range"] { width: 100%; }
label { font-size: 12px; color: var(--muted); }
.app {
  display: grid;
  grid-template-columns: 220px 1fr 300px;
  grid-template-rows: 100vh;
  gap: 8px;
  padding: 8px;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  overflow: auto;
}
.panel h3 { margin: 0 0 8px; font-size: 13px; }
.row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.row > .grow { flex: 1; }

/* 左侧：证件列表 */
.doc-list { display: flex; flex-direction: column; gap: 8px; }
.doc-card {
  border: 1px solid var(--border); border-radius: var(--radius); padding: 8px;
  cursor: pointer; background: #fff;
}
.doc-card.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(37,99,235,.15); }
.doc-card .title { font-weight: 600; }
.doc-card .meta { color: var(--muted); font-size: 11px; margin-top: 2px; }
.slot-thumbs { display: flex; gap: 4px; margin-top: 6px; }
.slot-thumb {
  width: 56px; height: 36px; border: 1px dashed var(--border);
  border-radius: 4px; background: #f4f4f5; display: flex;
  align-items: center; justify-content: center; color: var(--muted);
  font-size: 10px; overflow: hidden;
}
.slot-thumb.is-dragging { background: #dbeafe; }
.slot-thumb img { width: 100%; height: 100%; object-fit: cover; }

/* 中部：A4 预览 */
.middle { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.preview-toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
.preview-stack { display: flex; flex-direction: column; gap: 14px; align-items: center; padding-bottom: 20px; }
.preview-page {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,.1);
  border: 1px solid var(--border);
}
.scale-hint { color: var(--muted); font-size: 11px; }

/* 裁剪面板 */
.cropper-wrap { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.cropper-canvas { width: 100%; max-width: 480px; height: 320px; background: #1f2937; }

/* 右侧：水印 / 模板 */
.right-section { border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px; }
.toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 8px; border: 1px solid var(--border); border-radius: 999px;
  cursor: pointer; user-select: none; background: #fff;
}
.toggle.on { background: #fee2e2; border-color: #fca5a5; color: var(--brand); }

/* 打印：唯一保留 .print-target 子树 */
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff; }
  .app { display: none !important; }
  .print-target { display: block !important; }
}
.print-target { display: none; }
```

- [ ] **Step 2：跑构建并刷新浏览器，确认无 CSS 解析错误**

```bash
npm run build
```

打开 `dist/index.html`，应看到一个浅灰背景的页面（暂无内容）。

- [ ] **Step 3：提交**

```bash
git add src/styles.css
git commit -m "style: 3-column layout + panels + print styles"
```

---

### Task 15：右侧面板 `ui/rightPanel.js`

水印总开关、文字 / 颜色 / 透明度 / 字号、版式选择、模板列表与导入导出。

**Files:**
- Create: `src/ui/rightPanel.js`

- [ ] **Step 1：实现 `src/ui/rightPanel.js`**

```js
export function mountRightPanel({ root, store, templates }) {
  root.classList.add('panel');
  render();
  store.subscribe(render);

  function render() {
    const s = store.getState();
    const wm = s.watermark;
    const lay = s.layout;
    const fil = s.filters;
    root.replaceChildren();

    root.appendChild(h('h3', {}, ['水印']));
    const tgl = h('span', {
      class: 'toggle' + (wm.enabled ? ' on' : ''),
      onclick: () => store.dispatch({ type: 'WATERMARK_TOGGLE' })
    }, [wm.enabled ? '已开启' : '已关闭']);
    root.appendChild(tgl);

    root.appendChild(field('水印文字（支持 {project} / {date}）', textInput({
      value: wm.text, maxLength: 200,
      onInput: (v) => store.dispatch({ type: 'WATERMARK_SET', patch: { text: v } })
    })));
    root.appendChild(field('项目名', textInput({
      value: wm.project, maxLength: 80,
      onInput: (v) => store.dispatch({ type: 'WATERMARK_SET', patch: { project: v } })
    })));
    root.appendChild(field('颜色', colorInput({
      value: wm.color,
      onInput: (v) => store.dispatch({ type: 'WATERMARK_SET', patch: { color: v } })
    })));
    root.appendChild(field(`透明度 ${wm.opacity.toFixed(2)}`, rangeInput({
      min: 0, max: 1, step: 0.05, value: wm.opacity,
      onInput: (v) => store.dispatch({ type: 'WATERMARK_SET', patch: { opacity: Number(v) } })
    })));
    root.appendChild(field(`字号 ${wm.fontSize}`, rangeInput({
      min: 6, max: 60, step: 1, value: wm.fontSize,
      onInput: (v) => store.dispatch({ type: 'WATERMARK_SET', patch: { fontSize: Number(v) } })
    })));
    root.appendChild(field('包含日期', checkboxInput({
      checked: wm.includeDate,
      onChange: (v) => store.dispatch({ type: 'WATERMARK_SET', patch: { includeDate: v } })
    })));

    root.appendChild(h('div', { class: 'right-section' }));
    root.appendChild(h('h3', {}, ['版式']));
    root.appendChild(field('版式', selectInput({
      value: lay.type,
      options: [['stack', '上下排列'], ['side', '左右并排'], ['multi', '一页多份']],
      onChange: (v) => store.dispatch({ type: 'LAYOUT_SET', patch: { type: v } })
    })));
    if (lay.type === 'multi') {
      root.appendChild(field('一页多少份', numberInput({
        value: lay.perPage, min: 1, max: 12,
        onInput: (v) => store.dispatch({ type: 'LAYOUT_SET', patch: { perPage: Number(v) || 1 } })
      })));
    }
    root.appendChild(field('页边距 (mm)', numberInput({
      value: lay.margin, min: 0, max: 50,
      onInput: (v) => store.dispatch({ type: 'LAYOUT_SET', patch: { margin: Number(v) || 0 } })
    })));

    root.appendChild(h('div', { class: 'right-section' }));
    root.appendChild(h('h3', {}, ['复印件感（全局滤镜）']));
    root.appendChild(field('灰度', checkboxInput({
      checked: fil.grayscale,
      onChange: (v) => store.dispatch({ type: 'FILTERS_SET', patch: { grayscale: v } })
    })));
    root.appendChild(field(`亮度 ${fil.brightness.toFixed(2)}`, rangeInput({
      min: 0.5, max: 1.5, step: 0.05, value: fil.brightness,
      onInput: (v) => store.dispatch({ type: 'FILTERS_SET', patch: { brightness: Number(v) } })
    })));
    root.appendChild(field(`对比度 ${fil.contrast.toFixed(2)}`, rangeInput({
      min: 0.5, max: 1.5, step: 0.05, value: fil.contrast,
      onInput: (v) => store.dispatch({ type: 'FILTERS_SET', patch: { contrast: Number(v) } })
    })));

    root.appendChild(h('div', { class: 'right-section' }));
    root.appendChild(h('h3', {}, ['模板']));
    root.appendChild(templateList(store, templates));

    const saveBtn = h('button', { onclick: () => {
      const name = prompt('模板名称：', '我的模板');
      if (!name) return;
      const t = templates.save({ name, watermark: wm, layout: lay, filters: fil });
      store.dispatch({ type: 'TEMPLATES_SET', templates: templates.list() });
    }}, ['保存当前为模板']);
    const importBtn = h('button', { onclick: () => importTemplateFile(templates, store) }, ['导入 JSON']);
    root.appendChild(h('div', { class: 'row' }, [saveBtn, importBtn]));
  }
}

function templateList(store, templates) {
  const list = templates.list();
  store.dispatch({ type: 'TEMPLATES_SET', templates: list });
  if (!list.length) return h('p', { class: 'scale-hint' }, ['暂无模板']);
  return h('div', {}, list.map(t =>
    h('div', { class: 'row' }, [
      h('span', { class: 'grow' }, [t.name]),
      h('button', { onclick: () => store.dispatch({ type: 'TEMPLATE_LOAD', template: t }) }, ['加载']),
      h('button', { onclick: () => downloadText(templates.exportJson(t.id), `${t.name}.json`) }, ['导出']),
      h('button', { onclick: () => {
        if (confirm(`删除模板"${t.name}"？`)) {
          templates.remove(t.id);
          store.dispatch({ type: 'TEMPLATES_SET', templates: templates.list() });
        }
      }}, ['删'])
    ])
  ));
}

function importTemplateFile(templates, store) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    const text = await f.text();
    try {
      templates.importJson(text);
      store.dispatch({ type: 'TEMPLATES_SET', templates: templates.list() });
      alert('导入成功');
    } catch (e) {
      alert('导入失败：' + e.message);
    }
  };
  inp.click();
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 微型 DOM helpers
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  for (const c of children) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}
function field(label, control) {
  const wrap = h('div', { class: 'row' });
  const lbl = h('label', {}, [label]);
  const ctlBox = h('div', { class: 'grow' }, [control]);
  wrap.append(lbl, ctlBox);
  // 横排放不下时改为竖排：用 flex-direction
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'stretch';
  return wrap;
}
function textInput({ value, maxLength, onInput }) {
  const i = h('input', { type: 'text', maxlength: maxLength });
  i.value = value || '';
  i.addEventListener('input', () => onInput(i.value));
  return i;
}
function colorInput({ value, onInput }) {
  const i = h('input', { type: 'color' });
  i.value = value || '#dc2626';
  i.addEventListener('input', () => onInput(i.value));
  return i;
}
function rangeInput({ min, max, step, value, onInput }) {
  const i = h('input', { type: 'range', min, max, step });
  i.value = value;
  i.addEventListener('input', () => onInput(i.value));
  return i;
}
function checkboxInput({ checked, onChange }) {
  const i = h('input', { type: 'checkbox' });
  i.checked = !!checked;
  i.addEventListener('change', () => onChange(i.checked));
  return i;
}
function selectInput({ value, options, onChange }) {
  const s = h('select', {});
  for (const [v, l] of options) {
    const o = h('option', { value: v }, [l]);
    if (v === value) o.selected = true;
    s.append(o);
  }
  s.addEventListener('change', () => onChange(s.value));
  return s;
}
function numberInput({ value, min, max, onInput }) {
  const i = h('input', { type: 'number', min, max });
  i.value = value;
  i.addEventListener('input', () => onInput(i.value));
  return i;
}
```

- [ ] **Step 2：提交**

```bash
git add src/ui/rightPanel.js
git commit -m "feat(ui): right panel with watermark toggle, fields, layout, templates"
```

---

### Task 16：左侧面板 `ui/leftPanel.js`

证件列表 + 添加按钮 + 单张证件物理尺寸编辑 + 上传槽位。

**Files:**
- Create: `src/ui/leftPanel.js`

- [ ] **Step 1：实现 `src/ui/leftPanel.js`**

```js
import { DOCUMENT_KINDS } from '../constants.js';
import { bindUploadZone } from '../upload.js';

export function mountLeftPanel({ root, store, imageStore }) {
  root.classList.add('panel');
  render();
  store.subscribe(render);

  function render() {
    const s = store.getState();
    root.replaceChildren();
    root.appendChild(h('h3', {}, ['证件列表']));
    root.appendChild(addControl(store));
    const list = h('div', { class: 'doc-list' });
    for (const doc of s.documents) {
      list.appendChild(docCard(doc, s.activeDocId === doc.id, store, imageStore));
    }
    root.appendChild(list);
  }
}

function addControl(store) {
  const sel = h('select', {});
  for (const [key, meta] of Object.entries(DOCUMENT_KINDS)) {
    sel.append(h('option', { value: key }, [meta.label]));
  }
  const btn = h('button', { class: 'primary', onclick: () => {
    store.dispatch({ type: 'DOC_ADD', kind: sel.value });
  }}, ['＋ 添加']);
  return h('div', { class: 'row' }, [sel, btn]);
}

function docCard(doc, active, store, imageStore) {
  const meta = DOCUMENT_KINDS[doc.kind] || DOCUMENT_KINDS.other;
  const card = h('div', {
    class: 'doc-card' + (active ? ' active' : ''),
    onclick: () => store.dispatch({ type: 'ACTIVE_SET', docId: doc.id })
  });
  card.append(h('div', { class: 'title' }, [meta.label]));
  card.append(h('div', { class: 'meta' }, [
    `${doc.sizeMode === 'fixed' ? '1∶1' : '自适应'} · ${doc.physicalSize.wMm} × ${doc.physicalSize.hMm} mm`
  ]));

  // 物理尺寸编辑（小输入）
  const wIn = h('input', { type: 'number', min: 5, max: 420, step: 0.1 });
  const hIn = h('input', { type: 'number', min: 5, max: 420, step: 0.1 });
  wIn.value = doc.physicalSize.wMm;
  hIn.value = doc.physicalSize.hMm;
  const applySize = () => store.dispatch({
    type: 'DOC_SET_PHYSICAL_SIZE', docId: doc.id,
    wMm: Number(wIn.value), hMm: Number(hIn.value)
  });
  wIn.addEventListener('change', applySize);
  hIn.addEventListener('change', applySize);
  const sizeRow = h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [
    h('label', {}, ['宽']), wIn, h('label', {}, ['高']), hIn
  ]);
  card.append(sizeRow);

  // sizeMode 切换
  const modeBtn = h('button', { onclick: (e) => {
    e.stopPropagation();
    store.dispatch({
      type: 'DOC_SET_SIZE_MODE', docId: doc.id,
      mode: doc.sizeMode === 'fixed' ? 'fit' : 'fixed'
    });
  }}, [doc.sizeMode === 'fixed' ? '改为自适应' : '改为锁定 1∶1']);
  const delBtn = h('button', { onclick: (e) => {
    e.stopPropagation();
    if (confirm('删除该证件？')) store.dispatch({ type: 'DOC_REMOVE', docId: doc.id });
  }}, ['删除']);
  card.append(h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [modeBtn, delBtn]));

  // slot 缩略图 + 上传
  const thumbs = h('div', { class: 'slot-thumbs' });
  for (const slot of Object.keys(doc.slots)) {
    thumbs.appendChild(slotZone(doc, slot, store, imageStore));
  }
  card.append(thumbs);

  return card;
}

function slotZone(doc, slot, store, imageStore) {
  const zone = h('div', { class: 'slot-thumb', title: slot, onclick: (e) => e.stopPropagation() });
  const cur = doc.slots[slot];
  if (cur) {
    const entry = imageStore.get(cur.imageId);
    if (entry) {
      const img = h('img', {});
      img.src = entry.url;
      zone.append(img);
    } else {
      zone.append(document.createTextNode(slot));
    }
  } else {
    zone.append(document.createTextNode(slot));
  }
  bindUploadZone(zone, {
    onFile: async (file) => {
      try {
        const e = await imageStore.add(file);
        store.dispatch({ type: 'DOC_ADD_SLOT', docId: doc.id, slot, imageId: e.id });
      } catch (err) {
        alert(err.message);
      }
    }
  });
  return zone;
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  for (const c of children) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}
```

- [ ] **Step 2：提交**

```bash
git add src/ui/leftPanel.js
git commit -m "feat(ui): left panel with doc list, physical size editor, slot uploads"
```

---

### Task 17：中部预览面板 `ui/middlePanel.js`

订阅 state，实时调用 `layout.compose` + `renderer.renderPage` 显示 A4 预览；提供“裁剪 / 旋转 / 滤镜”工具栏给当前 active slot；底部导出按钮。

**Files:**
- Create: `src/ui/middlePanel.js`

- [ ] **Step 1：实现 `src/ui/middlePanel.js`**

```js
import { compose } from '../layout.js';
import { renderPage } from '../renderer.js';
import { mountCropper } from '../cropper.js';
import { toPng, toJpg, toPdf, printPlans } from '../exporter.js';

const PREVIEW_MM_PER_PX = 96 / 25.4 * 0.7;  // 屏幕约 0.7 倍打印尺寸

export function mountMiddlePanel({ root, store, imageStore }) {
  root.classList.add('panel', 'middle');

  const toolbar = document.createElement('div');
  toolbar.className = 'preview-toolbar';
  const previewStack = document.createElement('div');
  previewStack.className = 'preview-stack';
  const cropperWrap = document.createElement('div');
  cropperWrap.className = 'cropper-wrap';

  root.append(toolbar, cropperWrap, previewStack);

  let cropper = null;

  function activeSlot() {
    const s = store.getState();
    const doc = s.documents.find(d => d.id === s.activeDocId);
    if (!doc) return null;
    for (const name of Object.keys(doc.slots)) {
      if (doc.slots[name]) return { doc, slot: name, ref: doc.slots[name] };
    }
    return null;
  }

  function renderToolbar() {
    toolbar.replaceChildren();
    const sel = activeSlot();
    const exportBtn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => Promise.resolve(fn()).catch(e => alert(e.message));
      return b;
    };
    const plans = computePlans();
    const disabled = plans.length === 0;

    const pdf = exportBtn('导出 PDF', () => toPdf({ plans, imageGetter: id => imageStore.get(id) }));
    const png = exportBtn('导出 PNG', () => toPng({ plans, imageGetter: id => imageStore.get(id) }));
    const jpg = exportBtn('导出 JPG', () => toJpg({ plans, imageGetter: id => imageStore.get(id) }));
    const prn = exportBtn('系统打印', () => printPlans({ plans, imageGetter: id => imageStore.get(id) }));
    for (const b of [pdf, png, jpg, prn]) b.disabled = disabled;
    toolbar.append(pdf, png, jpg, prn);

    if (sel) {
      const rot = document.createElement('button');
      rot.textContent = '旋转 90°';
      rot.onclick = () => {
        store.dispatch({
          type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
          patch: { rotateDeg: ((sel.ref.transform.rotateDeg || 0) + 90) % 360 }
        });
      };
      const reset = document.createElement('button');
      reset.textContent = '重置变换';
      reset.onclick = () => {
        store.dispatch({
          type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
          patch: { scale: 1, rotateDeg: 0, offsetX: 0, offsetY: 0, cropRect: null }
        });
      };
      const crop = document.createElement('button');
      crop.textContent = sel.ref.transform.cropRect ? '取消裁剪' : '开始裁剪';
      crop.onclick = () => {
        const entry = imageStore.get(sel.ref.imageId);
        if (!entry) return;
        const cur = sel.ref.transform.cropRect;
        if (cur) {
          store.dispatch({
            type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
            patch: { cropRect: null }
          });
        } else {
          // 初始裁剪框：取图像中心 80%
          const w = entry.naturalWidth * 0.8;
          const h = entry.naturalHeight * 0.8;
          store.dispatch({
            type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
            patch: { cropRect: { x: (entry.naturalWidth - w) / 2, y: (entry.naturalHeight - h) / 2, w, h } }
          });
        }
      };
      toolbar.append(rot, crop, reset);
    }
  }

  function renderCropper() {
    cropperWrap.replaceChildren();
    if (cropper) { cropper.destroy(); cropper = null; }
    const sel = activeSlot();
    if (!sel) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cropper-canvas';
    cropperWrap.append(canvas);
    cropper = mountCropper({
      canvas,
      getEntry: () => imageStore.get(sel.ref.imageId),
      getTransform: () => store.getState().documents.find(d => d.id === sel.doc.id).slots[sel.slot].transform,
      onTransformChange: (patch) => {
        store.dispatch({
          type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot, patch
        });
      }
    });
    cropper.redraw();
  }

  function computePlans() {
    const s = store.getState();
    return compose({ documents: s.documents, layout: s.layout, watermark: s.watermark });
  }

  function renderPreview() {
    previewStack.replaceChildren();
    const plans = computePlans();
    const s = store.getState();
    const hint = document.createElement('div');
    hint.className = 'scale-hint';
    hint.textContent = plans.length
      ? `共 ${plans.length} 页 · 打印时请关闭"适合纸张大小"`
      : '从左侧选择证件、上传图片后预览将出现在这里';
    previewStack.append(hint);

    for (const plan of plans) {
      const c = renderPage(plan, {
        mmPerPx: PREVIEW_MM_PER_PX,
        imageGetter: (id) => imageStore.get(id),
        globalFilters: s.filters
      });
      c.className = 'preview-page';
      previewStack.append(c);
    }
  }

  function renderAll() {
    renderToolbar();
    renderCropper();
    renderPreview();
  }

  renderAll();
  store.subscribe(renderAll);
}
```

- [ ] **Step 2：提交**

```bash
git add src/ui/middlePanel.js
git commit -m "feat(ui): middle preview with live PagePlan render and export toolbar"
```

---

### Task 18：入口 `main.js`

挂载三栏 + 暴露 selftest 钩子。

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1：替换 `src/main.js`**

```js
import { createStore } from './state.js';
import { createImageStore } from './imageStore.js';
import { createTemplateService } from './templates.js';
import { mountLeftPanel } from './ui/leftPanel.js';
import { mountMiddlePanel } from './ui/middlePanel.js';
import { mountRightPanel } from './ui/rightPanel.js';

const store = createStore();
const imageStore = createImageStore();
const templates = createTemplateService();

// 暴露给浏览器控制台 / selftest（不暴露 imageStore.add 之外的写接口）
window.__app = { store, imageStore, templates };

const app = document.createElement('div');
app.className = 'app';
const left = document.createElement('div');
const middle = document.createElement('div');
const right = document.createElement('div');
app.append(left, middle, right);
document.getElementById('app').replaceWith(app);

mountLeftPanel({ root: left, store, imageStore });
mountMiddlePanel({ root: middle, store, imageStore });
mountRightPanel({ root: right, store, templates });

// 模板从 LocalStorage 同步初始列表
store.dispatch({ type: 'TEMPLATES_SET', templates: templates.list() });

// 刷新前清理图片（防止 OOM）
window.addEventListener('beforeunload', () => imageStore.clear());

// ?test=1 时加载自检
if (new URL(location.href).searchParams.get('test') === '1') {
  import('./selftest.js').then(m => m.runSelfTest());
}
```

- [ ] **Step 2：跑构建并在浏览器中验证三栏出现**

```bash
npm run build
```

打开 `dist/index.html`：
- 左侧能看到“证件列表”标题和下拉 + 添加按钮
- 中部空白预览提示文字
- 右侧水印开关、字段、版式、模板区
- DevTools Network 全程 0 请求；Console 无 CSP 错误

- [ ] **Step 3：提交**

```bash
git add src/main.js
git commit -m "feat(main): wire store, imageStore, templates into three-column UI"
```

---

## Phase 4：自检与预设

### Task 19：自检脚本 `selftest.js`

`?test=1` 触发，跑一组只读断言并把红绿结果钉在页面顶部。

**Files:**
- Create: `src/selftest.js`

- [ ] **Step 1：实现 `src/selftest.js`**

```js
import { A4, DOCUMENT_KINDS, DEFAULT_WATERMARK } from './constants.js';
import { compose } from './layout.js';
import { sanitizeTemplate } from './templateSchema.js';

export function runSelfTest() {
  const cases = [
    ['身份证默认锁定 1:1 且 85.6×54', () => {
      const k = DOCUMENT_KINDS.idCard;
      assertEq(k.sizeMode, 'fixed');
      assertEq(k.physicalSize.wMm, 85.6);
      assertEq(k.physicalSize.hMm, 54);
    }],
    ['stack 版式：身份证正反面 yMm 顺序正确', () => {
      const doc = {
        id: 'd', kind: 'idCard', sizeMode: 'fixed',
        physicalSize: { wMm: 85.6, hMm: 54 },
        slots: {
          front: { imageId: 'a', transform: {}, filters: {} },
          back:  { imageId: 'b', transform: {}, filters: {} }
        }
      };
      const [p] = compose({
        documents: [doc],
        layout: { type: 'stack', perPage: 1, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: true }
      });
      assertTrue(p.items[0].yMm < p.items[1].yMm);
      assertEq(round1(p.items[0].wMm), 85.6);
    }],
    ['multi 版式：5 个文档 perPage=3 → 2 页', () => {
      const docs = Array.from({ length: 5 }, (_, i) => ({
        id: 'd' + i, kind: 'idCard', sizeMode: 'fixed',
        physicalSize: { wMm: 85.6, hMm: 54 },
        slots: { front: { imageId: 'a', transform: {}, filters: {} }, back: null }
      }));
      const plans = compose({
        documents: docs,
        layout: { type: 'multi', perPage: 3, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: true }
      });
      assertEq(plans.length, 2);
    }],
    ['fit 类不放大：自然 50×30 在 stack 中仍为 50×30', () => {
      const doc = {
        id: 'tiny', kind: 'other', sizeMode: 'fit',
        physicalSize: { wMm: 50, hMm: 30 },
        slots: { front: { imageId: 'a', transform: {}, filters: {} } }
      };
      const [p] = compose({
        documents: [doc],
        layout: { type: 'stack', perPage: 1, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: false }
      });
      assertEq(round1(p.items[0].wMm), 50);
      assertEq(round1(p.items[0].hMm), 30);
    }],
    ['水印 enabled=false → PagePlan.watermark === null', () => {
      const doc = {
        id: 'd', kind: 'idCard', sizeMode: 'fixed',
        physicalSize: { wMm: 85.6, hMm: 54 },
        slots: { front: { imageId: 'a', transform: {}, filters: {} }, back: null }
      };
      const [p] = compose({
        documents: [doc],
        layout: { type: 'stack', perPage: 1, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: false }
      });
      assertEq(p.watermark, null);
    }],
    ['template schema：非法颜色被回退', () => {
      const t = sanitizeTemplate({
        name: 'x',
        watermark: { color: '<script>', opacity: 0.3 },
        layout: { type: 'stack' }, filters: {}
      });
      assertMatch(t.watermark.color, /^#[0-9a-f]{6}$/i);
    }],
    ['template schema：未知字段丢弃', () => {
      const t = sanitizeTemplate({
        evil: 1, name: 'x',
        watermark: { imageId: 'leak' }, layout: {}, filters: {}
      });
      assertEq('evil' in t, false);
      assertEq('imageId' in t.watermark, false);
    }],
    ['A4 = 210×297 mm', () => {
      assertEq(A4.wMm, 210);
      assertEq(A4.hMm, 297);
    }]
  ];

  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;font-family:monospace;background:#fff;border-bottom:2px solid #ccc;max-height:40vh;overflow:auto';
  document.body.prepend(bar);

  let pass = 0, fail = 0;
  for (const [name, fn] of cases) {
    try {
      fn();
      const line = document.createElement('div');
      line.style.color = '#15803d';
      line.textContent = '✔ ' + name;
      bar.append(line);
      pass++;
    } catch (e) {
      const line = document.createElement('div');
      line.style.color = '#b91c1c';
      line.textContent = `✘ ${name}: ${e.message}`;
      bar.append(line);
      fail++;
    }
  }
  const sum = document.createElement('div');
  sum.style.fontWeight = '600';
  sum.style.marginTop = '4px';
  sum.textContent = `自检：通过 ${pass} / 失败 ${fail}`;
  bar.prepend(sum);
}

function assertEq(a, b) {
  if (a !== b) throw new Error(`期望 ${JSON.stringify(b)}，得到 ${JSON.stringify(a)}`);
}
function assertTrue(v) { if (!v) throw new Error('断言失败'); }
function assertMatch(s, re) { if (!re.test(String(s))) throw new Error(`不匹配 ${re} (${s})`); }
function round1(n) { return Math.round(n * 10) / 10; }
```

- [ ] **Step 2：跑构建并在浏览器中验证**

```bash
npm run build
```

打开 `dist/index.html?test=1`，页面顶部应出现绿色 8 条 ✔ 和 “自检：通过 8 / 失败 0”。

- [ ] **Step 3：提交**

```bash
git add src/selftest.js
git commit -m "feat(selftest): in-page assertions for layout/template/watermark invariants"
```

---

### Task 20：三份预设模板 JSON

**Files:**
- Create: `templates/投标红.json`
- Create: `templates/灰度复印.json`
- Create: `templates/低调灰.json`

- [ ] **Step 1：写 `templates/投标红.json`**

```json
{
  "name": "投标红（默认）",
  "watermark": {
    "enabled": true,
    "text": "仅供{project}投标使用 {date}",
    "project": "某某项目",
    "color": "#dc2626",
    "opacity": 0.35,
    "fontSize": 14,
    "angleDeg": -30,
    "gapX": 140,
    "gapY": 90,
    "includeDate": true
  },
  "layout": { "type": "stack", "perPage": 1, "margin": 18 },
  "filters": { "grayscale": false, "brightness": 1, "contrast": 1 }
}
```

- [ ] **Step 2：写 `templates/灰度复印.json`**

```json
{
  "name": "灰度复印（黑白复印机感）",
  "watermark": {
    "enabled": true,
    "text": "仅供{project}投标使用 {date}",
    "project": "某某项目",
    "color": "#dc2626",
    "opacity": 0.35,
    "fontSize": 14,
    "angleDeg": -30,
    "gapX": 140,
    "gapY": 90,
    "includeDate": true
  },
  "layout": { "type": "stack", "perPage": 1, "margin": 18 },
  "filters": { "grayscale": true, "brightness": 1.05, "contrast": 1.1 }
}
```

- [ ] **Step 3：写 `templates/低调灰.json`**

```json
{
  "name": "低调灰（不抢眼）",
  "watermark": {
    "enabled": true,
    "text": "仅供{project}内部留存 {date}",
    "project": "某某项目",
    "color": "#404040",
    "opacity": 0.25,
    "fontSize": 12,
    "angleDeg": -30,
    "gapX": 160,
    "gapY": 100,
    "includeDate": true
  },
  "layout": { "type": "stack", "perPage": 1, "margin": 18 },
  "filters": { "grayscale": false, "brightness": 1, "contrast": 1 }
}
```

- [ ] **Step 4：人工验证导入**

打开 `dist/index.html` → 右侧“导入 JSON”按钮 → 选三份模板 → 列表里出现 → 点“加载” → 水印外观变化符合各模板描述。

- [ ] **Step 5：提交**

```bash
git add templates/
git commit -m "feat(presets): three template JSONs — bid red, gray copy, low-key gray"
```

---

### Task 21：README

**Files:**
- Create: `README.md`

- [ ] **Step 1：写 `README.md`**

```markdown
# 证件复印小工具

一个单 HTML 文件的小工具，把身份证、营业执照、学历证、护照等证件图按 A4 版式合成，叠加可选水印，导出 PDF / PNG / JPG 或调起系统打印。所有处理纯本地完成，证件图不离开浏览器，刷新即丢。

## 使用方法

1. 双击打开 `dist/index.html`，浏览器直接运行（推荐 Chrome / Edge 最新版）
2. 左侧选证件类型 → 添加 → 上传正面 / 反面（点击 / 拖拽 / 粘贴）
3. 中部裁剪 / 旋转 / 缩放；右侧调水印文字、颜色、版式
4. 顶部按钮：导出 PDF / 导出 PNG / 导出 JPG / 系统打印

## 打印 1∶1 注意事项

- 身份证、驾驶证、港澳通行证、护照 **锁定原物理尺寸**（85.6×54mm / 125×88mm）
- 营业执照、学历 / 学位证、荣誉证书、资质证书等 **按版式自适应缩放**（保留长宽比）
- 打印对话框中务必关闭"适合纸张大小"或"缩放"选项，否则会偏离 1∶1

## 隐私

- 不连接任何网络（CSP `connect-src 'none'` 强制）
- 证件图仅在浏览器内存中存在，不进 LocalStorage、不进 IndexedDB
- 模板（水印文字 / 颜色 / 版式）保存在浏览器 LocalStorage，可导出为 JSON
- 离线可用：网络断开后所有功能正常

## 兼容性

| 浏览器 | 状态 |
|---|---|
| Chrome / Edge 最新两个版本 | 完整支持 |
| Safari 16+ | 完整支持（HEIC 解码视系统而定） |
| Firefox 最新 | 完整支持 |
| 移动端 Safari / Chrome | 基础查看可用，导出体验降级 |

## 自检

打开 `dist/index.html?test=1`，页面顶部会显示一组红绿断言结果。

## 开发

```bash
npm install
npm test            # 单元测试
npm run build       # 输出 dist/index.html
npm run dev         # 构建后用 python3 起一个本地静态服务器
```
```

- [ ] **Step 2：标点检查**

```bash
python3 ~/tools/punctuation_check.py README.md
```

修复散文中的英文直引号（代码块内保留）。

- [ ] **Step 3：提交**

```bash
git add README.md
git commit -m "docs: usage, privacy, print 1:1 guidance, browser matrix"
```

---

## Phase 5：手动验证与发布

### Task 22：跑全部单元测试与构建

**Files:** 无（验收步骤）

- [ ] **Step 1：跑全部测试**

```bash
npm test
```

预期：所有 5 个测试文件（constants、state、layout、watermark、templateSchema、imageStore、templates）全部 PASS。

- [ ] **Step 2：跑生产构建**

```bash
npm run build
```

预期：`dist/index.html` 生成，体积约 350-450 KB。

- [ ] **Step 3：?test=1 自检**

打开 `dist/index.html?test=1`，应看到 8 条 ✔。

- [ ] **Step 4：网络隔离测试**

DevTools → Network → 勾选“Offline” → 刷新 `dist/index.html` → 全部 UI 正常 → 走一遍上传 → 导出 PDF 流程，确认 0 个外发请求。

### Task 23：手动验证清单（按 spec 第 7.2 节）

**Files:** 无

逐条勾选 spec `2026-06-12-id-copy-watermark-tool-design.md` 第 7.2 节的 19 条手动用例：

- [ ] 1. 身份证正反 + stack + 默认水印 → 导出 PDF（< 2MB，水印覆盖完整）
- [ ] 2. multi 版式 perPage=3 → 三份均匀
- [ ] 3. 5 个不同证件 → 多页 PDF，页数与证件数一致
- [ ] 4. 旋转 / 裁剪 / 亮度对比度 → PNG 中保留
- [ ] 5. 切换灰度，水印仍保持指定颜色
- [ ] 6. 保存模板 → 刷新 → 模板还在，证件图消失
- [ ] 7. 导出模板 JSON → 改名导入 → 字段还原
- [ ] 8. 恶意 JSON（`<script>`、未知字段、超大数值）→ 拒绝或截断，不崩溃
- [ ] 9. 离线打开 → 全功能可用
- [ ] 10. DevTools Network 监控 → 0 个外发请求
- [ ] 11. HEIC / SVG / 巨型 PNG → 提示或降采样
- [ ] 12. 系统打印 → A4 满版，水印同时印出
- [ ] 13. 水印开关关闭 → 三种产出无水印；再开启恢复
- [ ] 14. 当前开关关闭时加载带水印的模板 → 开关仍为关闭
- [ ] 15. 打印身份证后用尺子量 → 85.6mm × 54mm（± 0.5mm）
- [ ] 16. 打印护照内页后量 → 125mm × 88mm
- [ ] 17. 营业执照 + 身份证混排 stack → 身份证 1∶1、营业执照等比缩放
- [ ] 18. multi 版式混排 fixed + fit → fixed 槽位固定，fit 填充
- [ ] 19. 手工把“学历证”切换为 fixed → 走自动续页

任一项失败：

- 记录失败现象与浏览器
- 回到对应 Task 修正
- 重跑 Step 22 全部测试与构建
- 重新走 23 全部用例

### Task 24：发布与归档

**Files:**
- Modify: 视情况

- [ ] **Step 1：把 dist/ 也提交（让最终用户能直接拿到 HTML）**

```bash
# 临时调整 .gitignore，仅保留 dist/index.html
echo '!dist/index.html' >> .gitignore
git add .gitignore dist/index.html
git commit -m "build: ship dist/index.html as release artifact"
```

- [ ] **Step 2：打标签**

```bash
git tag v1.0.0
```

- [ ] **Step 3：把 `dist/index.html` 复制到本仓库根，便于双击打开**

```bash
cp dist/index.html ./证件复印小工具.html
git add ./证件复印小工具.html
git commit -m "release: copy dist as 证件复印小工具.html for double-click usage"
```

- [ ] **Step 4：终态校验**

```bash
ls -la 证件复印小工具.html dist/index.html
git log --oneline
git tag
```

预期：双击根目录的 `证件复印小工具.html` 即可使用，无需任何运行时。

---

## 自检（Plan Self-Review）

执行计划的工程师按本表对照设计文档审核：

### Spec 覆盖检查

| Spec 节 | 实现位置 |
|---|---|
| §2 支持证件类型 | Task 3 `DOCUMENT_KINDS` |
| §2 水印开关 | Task 4 `WATERMARK_TOGGLE` action；Task 15 UI 顶部开关 |
| §2 水印内容（含日期） | Task 6 `resolveText` 解析 `{date}` |
| §2 水印版式 对角平铺 | Task 6 `drawTo` 旋转 + 平铺 |
| §2 A4 版式 stack/side/multi | Task 5 `compose` 三个分支 |
| §2 打印 1∶1（fixed）+ 自适应（fit） | Task 5 `sizeForItem` 按 `sizeMode` 分支；Task 3 默认值 |
| §2 输出 PDF/PNG/JPG/打印 + 多页 | Task 12 `toPdf / toPng / toJpg / printPlans` |
| §2 隐私边界 纯本地 | Task 2 CSP `connect-src 'none'`；Task 8 仅内存 ImageBitmap |
| §2 视觉风格全部可调 | Task 15 字段；Task 20 三套预设 |
| §2 图像处理（多种上传 / 裁剪 / 亮度对比） | Task 9 upload；Task 11 cropper；Task 15 全局滤镜 |
| §2 单 HTML 交付 | Task 2 build.mjs 内联；Task 24 复制根目录 |
| §2 项目模板 | Task 13 `createTemplateService` |
| §2.1 物理尺寸表 | Task 3 `DOCUMENT_KINDS` 数值 |
| §2.1 锁定 / 自适应规则 | Task 5 `sizeForItem` |
| §2.1 sizeMode 用户可覆盖 | Task 4 `DOC_SET_SIZE_MODE`；Task 16 切换按钮 |
| §3 单文件、内联 pdf-lib | Task 2 build 流程 |
| §3 四条核心准则 | Task 2（CSP）、Task 4（dispatch）、Task 8（会话清空）、Task 13（模板分离） |
| §3 不引 helmet / DOMPurify | 计划中无相应依赖 |
| §4 9 个模块 | Tasks 3–13、15–17 一一对应 |
| §5 状态结构 | Task 4 `createStore` + 默认常量 |
| §5 数据流 | Task 17 `renderAll` 订阅 store |
| §5.3 PagePlan mm 单位 | Task 5 输出毫米；Task 12 mm→pt |
| §6.1 错误处理表 | Task 8 MIME 白名单 / 降采样；Task 9 alertOnce；Task 12 空 plan 报错；Task 13 LocalStorage 失败降级；Task 4 模板加载尊重 enabled |
| §6.2 CSP / referrer / textContent / Object URL 生命周期 | Task 2 head meta；Task 8 revokeObjectURL；Task 15/16 helpers 仅用 `textContent` |
| §6.3 不引入的库 | 计划全程不出现 |
| §7.1 内嵌自检 | Task 19 |
| §7.2 手动验证清单 | Task 23 |
| §7.3 浏览器兼容矩阵 | Task 21 README |
| §8 交付物 | Task 2 dist；Task 20 三份模板；Task 21 README；Task 24 根目录复制 |

无遗漏。

### 占位符扫描

无 “TBD / TODO / 实现略 / 类似 Task N 略” 等表述；每个步骤都有可直接执行的命令或可粘贴的代码。

### 类型一致性

- `imageStore.get(id)` 返回 `{ id, url, bitmap, naturalWidth, naturalHeight } | null`，被 `renderer`、`leftPanel`、`middlePanel`、`exporter` 一致使用。
- PagePlan `items` 字段名 `xMm/yMm/wMm/hMm` 在 `layout.js`、`renderer.js`、自检中一致。
- `transform` 字段 `{ scale, rotateDeg, offsetX, offsetY, cropRect }` 在 state、cropper、renderer 中一致。
- action `type` 字符串均为大写蛇形，在 store、UI 各处保持一致。

无不一致。

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-06-12-id-copy-watermark-tool.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 我每个 Task 派一个新的 subagent 实施 → 两阶段评审（self-review → code-review）→ 下一个 Task。适合追求高质量与可回滚。
2. **Inline Execution** — 在当前会话里按计划批量执行，途中插入检查点让你过目。适合想要“一气呵成”。

请告诉我选哪种，我即刻进入实施阶段。

