# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

证件复印小工具 — 纯前端单 HTML 应用，把证件照按 A4 版式排版，加水印，导出 PDF/PNG/JPG 或打印。所有处理本地完成，不连网。

## 命令

```bash
npm test              # 运行全部测试（vitest + happy-dom）
npm run test:watch    # 测试监听模式
npm run build         # esbuild 打包 → dist/index.html（内联 CSS/vendor/app）
npm run dev           # build + python3 http.server 在 8088 端口
```

自检模式：浏览器打开 `dist/index.html?test=1`。

## 架构

```
src/
├── main.js              # 入口，创建 store/imageStore/templates，挂载三栏 UI
├── state.js             # 全局状态（reducer pattern），documents/layout/watermark/filters/templates
├── constants.js         # A4 尺寸、证件类型定义、默认水印/版式/滤镜
├── layout.js            # 排版引擎：compose() → stack/side/multi 三种版式 → PagePlan 数组
├── renderer.js          # PagePlan → Canvas（应用全局滤镜 + slot 级滤镜 + 水印）
├── exporter.js          # toPdf/toPng/toJpg/printPlans，全部接收 globalFilters
├── watermark.js         # 水印绘制（斜排重复文字）
├── imageStore.js        # 图片 blob → bitmap 缓存，刷新前清空
├── templates.js         # 模板 CRUD（LocalStorage）
├── templateSchema.js    # 模板导入校验（sanitize）
├── upload.js            # click/drag/paste 触发 file input 上传
├── cropper.js           # 裁剪/旋转/缩放控件
└── ui/
    ├── leftPanel.js     # 证件列表：类型选择、添加/删除、尺寸模式、正/反面图片槽位
    ├── middlePanel.js   # 预览面板：导出按钮、裁剪器、renderPreview（低清预览）
    └── rightPanel.js    # 设置面板：水印、版式（含 gap/slotGap）、复印件感滤镜、模板
```

### 状态管理（state.js）

`createStore()` 返回 `{ getState, dispatch, subscribe }`。reducer 处理以下 action type：
- `DOC_ADD/REMOVE/SET_KIND/SET_SIZE_MODE/SET_PHYSICAL_SIZE`
- `DOC_ADD_SLOT/REMOVE_SLOT/SET_SLOT_TRANSFORM/SET_SLOT_FILTERS`
- `LAYOUT_SET`（generic patch merge → `{ ...layout, ...patch }`）
- `WATERMARK_SET/WATERMARK_TOGGLE`、`FILTERS_SET`、`TEMPLATE_LOAD/SAVE/REMOVE/SET`

### 排版 — 间距体系（layout.js）

三种版式通过 `compose()` 路由：

| 版式 | 函数 | slotGap 语义 | gap 语义 |
|------|------|-------------|----------|
| stack | `composeStack` | 同 docId 的 slot 之间纵向间距 | 不同 docId 之间纵向间距 |
| side | `composeSide` | 同行同 docId 两项的横向列间距 | 行间纵向间距 |
| multi | `composeMulti` | 同 doc 内 slot 横向间距 | doc 行间纵向间距 |

`layout.gap` 和 `layout.slotGap` 默认 6mm（范围 0-80mm），分别由 `resolveGap()` / `resolveSlotGap()` 解析。

### 滤镜 — 两层合并（renderer.js）

每个 slot 有独立 `filters`（brightness/contrast/grayscale），渲染时与全局 `globalFilters` 合并：
- brightness/contrast：全局 × 局部（乘法叠加）
- grayscale：全局 OR 局部（任一为 true 即生效）

所有导出函数（toPdf/toPng/toJpg/printPlans）的 `globalFilters` 来自 `store.getState().filters`。

### 导出与物理尺寸

- PDF 通过 pdf-lib（vendor/pdf-lib.min.js），JPG 嵌入 PDF 页面
- PNG/JPG 多页纵向拼接为一张图片
- 打印通过临时 iframe + `@page { size: A4 }` 调起系统对话框
- `PT_PER_MM = 72 / 25.4`（mm → PDF pt 的换算用乘法）

### 构建

`build.mjs` 将 `src/main.js` 通过 esbuild 打包成 IIFE，与 `src/styles.css`、`vendor/pdf-lib.min.js` 一起内联到 `src/index.template.html`，输出单一 `dist/index.html`（约 580KB）。

## 测试

测试文件在 `tests/` 目录，使用 vitest + happy-dom 环境。每个测试文件对应一个源模块。`happy-dom` 提供类浏览器的 DOM API，但不含 Canvas——涉及 Canvas 的逻辑需在浏览器中验证。
