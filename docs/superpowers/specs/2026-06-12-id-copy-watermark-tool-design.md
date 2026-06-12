# 证件复印小工具设计文档

- 状态：草案
- 创建日期：2026-06-12
- 项目目录：`/Users/wangyuehua/Downloads/证件复印小工具`

## 1. 背景与目标

为投标、报名、签约等正式用途快速生成“复印件”格式的证件页：将身份证、营业执照、学历证、护照等证件图片合成到 A4 版式，并叠加文字水印（含自动日期），用于打印或随投标材料附上。

**目标**：

- 双击单 HTML 即可使用，离线可跑
- 证件图全程不离开本机，刷新即丢
- 一键导出 PDF / PNG / JPG，支持调起系统打印
- 水印文字、颜色、版式可自定义，可保存多个项目模板

**非目标**：

- 不做证件真伪识别、OCR、自动信息提取
- 不做账号系统、不做云同步
- 不做安卓 / iOS 原生 App，仅静态网页

## 2. 需求摘要

| 维度 | 决策 |
|---|---|
| 支持的证件类型 | 身份证（正反面）、营业执照 / 资质证书、学历 / 学位 / 职业资格证、护照 / 港澳通行证 / 驾驶证、荣誉证书 / 获奖证书 |
| 水印开关 | **用户可决定是否加水印**：右侧面板顶部一个总开关，关闭后整张 A4 不渲染水印；模板加载时也尊重该开关状态 |
| 水印内容 | 文字水印 + 自动日期（开启时） |
| 水印版式 | 对角平铺（默认） |
| A4 版式 | 运行时可切换：上下排列 / 左右并排 / 一页多份 |
| 打印尺寸 | **身份证、驾驶证、港澳通行证、护照锁定 1∶1，不允许放大或缩小**；营业执照、学历 / 学位 / 职业资格证、荣誉证书、资质证书等大幅证书按版式自适应缩放（保留长宽比） |
| 输出方式 | 一键导出 PDF、导出 PNG / JPG、调起系统打印、多页合并 PDF |
| 隐私边界 | 纯本地处理；证件图不进任何持久化存储 |
| 视觉风格 | 颜色 / 透明度 / 字号 / 灰度全部可调；提供“投标红 / 灰度复印 / 低调灰”等预设 |
| 图像处理能力 | 多种上传方式（点击 / 拖拽 / 粘贴）、手动裁剪 / 旋转 / 缩放、亮度对比度微调 |
| 交付形式 | 单 HTML 文件（含全部 CSS 与 JS） |
| 项目模板 | LocalStorage 多模板保存；模板里的文字可在生成时手动修改；可导出 / 导入 JSON |

### 2.1 证件实际物理尺寸与缩放规则

证件分两类：**锁定 1∶1**（必须按原物理尺寸打印）与 **自适应**（按版式与可用空间等比缩放）。

| 证件 | 标准尺寸 (W × H mm) | 缩放规则 | 备注 |
|---|---|---|---|
| 身份证（正 / 反） | 85.6 × 54.0 | **锁定 1∶1** | 国标 GB 11643，CR80 卡基 |
| 驾驶证（主页 / 副页） | 85.6 × 54.0 | **锁定 1∶1** | 与身份证同 |
| 港澳通行证（卡式） | 85.6 × 54.0 | **锁定 1∶1** | 与身份证同 |
| 护照内页 | 125 × 88 | **锁定 1∶1** | 单面 |
| 营业执照（正本） | 297 × 210（参考） | 自适应 | 长宽比保留 |
| 学历 / 学位证（摊开） | 285 × 210（参考） | 自适应 | 长宽比保留 |
| 荣誉 / 获奖证书 | 用户自填，默认 285 × 210 | 自适应 | 规格不一 |
| 资质证书 | 用户自填 | 自适应 | 规格不一 |

**规则细节**：

- **锁定 1∶1 类**：不论选什么版式，永远按 `physicalSize` 毫米数渲染到 A4；若一页放不下，自动续页（autoPage），不弹缩放对话框
- **自适应类**：按当前版式（stack / side / multi）的可用槽位等比缩放，保留长宽比；不会因为“看着小”被自动放大超过 100%
- 状态结构里通过 `sizeMode: 'fixed' | 'fit'` 标识；`kind` 决定默认值，用户可在单张证件上覆盖（例如把“学历证”切到 fixed 也允许）

## 3. 整体架构

```
单 HTML 文件（约 250KB）
├─ <head> 内联 CSS（页面与打印两套样式，打印样式以 mm 为单位）
├─ <body> 三栏布局
│   ├─ 左侧：证件列表（缩略图 + 拖拽排序 + 单张物理尺寸编辑）
│   ├─ 中部：A4 画布预览（实时渲染，左下角显示当前打印缩放比 100% 提示）
│   └─ 右侧：设置面板（水印总开关 + 文字 / 颜色 / 透明度 / 版式 / 模板）
└─ <script> 顺序加载：
    1. pdf-lib（base64 内嵌，约 200KB）
    2. core/  — 状态、事件总线
    3. modules/ — 上传、裁剪、水印、渲染、导出
```

**四条核心准则**：

- **单一可信源**：所有状态集中在一个 `AppState` 对象，UI 是它的投影，任何修改都通过 `dispatch()`
- **纯本地**：禁用所有 `fetch` / `XHR`；CSP 元标签 `connect-src 'none'` 从 HTML 层堵死外发
- **会话清空**：证件图只活在内存 + Canvas，不进 LocalStorage，刷新即丢
- **模板可分离**：水印模板（文本 / 颜色 / 版式）走 LocalStorage，也可导出 JSON 文件

**技术选型**：

- 内嵌 `pdf-lib`（约 200KB，纯 JS，无 Worker 依赖）做 PDF 拼装
- 不引 Cropper.js，自写约 200 行的轻量裁剪框（拖角点缩放、滚轮缩放、Shift 锁比例）
- 全程使用 HTML5 Canvas 完成图像处理与水印绘制
- 不引 helmet（无服务端）、不引 DOMPurify（无 HTML 注入入口）

## 4. 组件拆分

九个模块，每个对外只暴露一个入口函数，互不直接读对方内部状态。

| 模块 | 职责 | 主要 API |
|---|---|---|
| `state.js` | 应用状态与订阅 | `getState() / dispatch(action) / subscribe(fn)` |
| `upload.js` | 文件输入：点击、拖拽、粘贴 | `bindUploadZone(el)` |
| `imageStore.js` | 内存中的 ImageBitmap 池，会话级 | `add(file) → id / get(id) / remove(id)` |
| `cropper.js` | 单张图的裁剪 / 旋转 / 缩放 / 调亮度对比度交互 | `mount(canvas, sourceId)` |
| `watermark.js` | 水印渲染（对角平铺，支持文字 + 日期占位符） | `drawTo(ctx, config, pageSize)` |
| `layout.js` | A4 排版引擎（上下 / 左右 / 一页多份） | `compose(items, layoutType) → PagePlan[]` |
| `renderer.js` | 把 `PagePlan` 渲染到离屏 Canvas | `renderPage(plan, opts) → HTMLCanvasElement` |
| `exporter.js` | 输出 PNG / JPG / PDF + 触发打印 | `toPng() / toPdf() / print()` |
| `templates.js` | 水印模板的存取，写 LocalStorage | `list() / save(t) / remove(id) / exportJson() / importJson()` |

**依赖方向**（单向，不互相调用）：

```
upload → imageStore → cropper → state → layout → renderer → exporter
                                  ↑          ↑
                                  └ watermark┘
                                  └ templates
```

**约束**：

- `renderer` 是唯一直接画到画布的模块；其它模块只产出参数
- `exporter` 不知道 `state`，只接受 `PagePlan[]`，便于将来批量导出与单元测试
- `templates` 只读写文本 / 颜色配置；写入前白名单过滤，没有任何路径能让证件图进 LocalStorage

## 5. 数据流

### 5.1 状态结构

```js
AppState = {
  documents: [          // 用户已上传的证件
    {
      id: 'doc_1',
      kind: 'idCard',   // idCard | drivingLicense | passport | hkMacau
                        // | businessLicense | diploma | award | qualification | other
      sizeMode: 'fixed',                       // fixed = 锁定 1∶1，fit = 自适应缩放
      physicalSize: { wMm: 85.6, hMm: 54.0 },  // 实际打印尺寸，按 kind 预设，可手工覆盖
      slots: {
        front: {
          imageId,
          transform: { scale, rotateDeg, offsetX, offsetY, cropRect },
          filters:   { brightness, contrast, grayscale }
        },
        back: { ... }
      }
    }
  ],
  layout: {
    type: 'stack',      // stack | side | multi
    perPage: 1,
    margin: 18,
    // 锁定 1∶1 的证件版式放不下时自动续页；自适应类按可用空间等比缩放
  },
  watermark: {
    enabled: true,      // 用户可关掉，关掉后整份 A4 不渲染水印
    text: '仅供{project}投标使用 {date}',
    project: '某某项目',
    color: '#dc2626',
    opacity: 0.35,
    fontSize: 14,
    angleDeg: -30,
    gapX: 140,
    gapY: 90,
    includeDate: true
  },
  filters: { grayscale: false, contrast: 1.0, brightness: 1.0 },
  templates: [{ id, name, watermark, layout, filters }],
  activeDocId: 'doc_1'
}
```

**与打印 1∶1 的关系**：

- `sizeMode === 'fixed'` 的证件：`physicalSize` 是 PagePlan 唯一权威尺寸，渲染与导出永远按毫米数 1∶1
- `sizeMode === 'fit'` 的证件：按版式槽位等比缩放，保留长宽比，但不会被自动放大超过 100%
- 屏幕预览用 CSS px 模拟、PDF 用毫米对应的点数（pdf-lib 1mm = 2.8346 pt）、系统打印用 CSS `@page A4` + 元素 mm
- 用户必须在系统打印对话框关闭“适合纸张大小”等缩放选项，README 中明确告知

### 5.2 典型流程（上传 → 调整 → 导出 PDF）

```
1. 用户拖入图片
     upload.js → imageStore.add(file) → 返回 imageId
     dispatch({ type: 'DOC_ADD_SLOT', docId, slot: 'front', imageId })

2. 用户在裁剪框里调整
     cropper.js 监听 pointermove → dispatch({ type: 'DOC_TRANSFORM', ... })

3. state 变更广播 → 中部预览订阅 → 重新 compose + renderPage 到屏幕
     layout.compose(state.documents, state.layout) → PagePlan[]
     renderer.renderPage(plan, { watermark, filters }) → canvas

4. 用户点"导出 PDF"
     exporter.toPdf():
       for each PagePlan:
         renderer.renderPage(plan, ..., 300dpi)   // 高分辨率重渲染
         pdfDoc.addPage(A4).drawImage(canvas)
       blob → 触发下载
```

### 5.3 中间契约 `PagePlan`

解耦 layout 与 renderer，便于单独测试：

```js
PagePlan = {
  pageSize: { w: 210, h: 297, unit: 'mm' },
  items: [
    { sourceId, transform, filters,
      xMm, yMm, wMm, hMm }      // 全部用毫米，保证打印 1∶1
  ],
  watermark: { ... } | null     // null 表示水印关闭，直接跳过水印渲染
}
```

### 5.4 设计动机

- 状态扁平，订阅粒度细：调一个滑块只重绘屏幕预览，不动 PDF 流程
- `PagePlan` 是导出与预览的唯一契约，可单独测试 `layout`，可单独测试 `renderer`
- 模板里只存配置不存 `imageId`，从结构上禁止“模板带证件图泄漏”

## 6. 错误处理与安全约束

### 6.1 预期失败 → 友好提示

| 场景 | 处理 |
|---|---|
| 上传非图像文件 | 上传层拒绝；MIME 白名单 `image/jpeg`、`image/png`、`image/webp`、`image/heic` |
| 图片超大（> 20MB）或维度异常（> 8000px） | 按比例降采样到 4000px 内，提示已自动压缩 |
| HEIC / HEIF 浏览器无法解码 | 捕获 `createImageBitmap` 异常，提示“当前浏览器不支持 HEIC，请先转 JPG” |
| 模板 JSON 导入校验失败 | 严格 schema 校验，只接受白名单字段，类型不符直接拒绝 |
| 水印文本超长（> 200 字） | 输入框 `maxlength=200`，避免极端情况渲染卡死 |
| 导出时未上传任何图 | 导出按钮置灰 + 提示“请至少添加一张证件图” |
| 实际尺寸放不下当前版式 | 锁定 1∶1 类自动续页（不弹窗）；自适应类按可用空间等比缩放（不超过 100%）|
| 水印开关关闭但模板里有水印 | 加载模板时尊重当前开关；不自动开启，避免误以为关掉了还在加 |
| LocalStorage 写失败（隐私模式 / 配额满） | 降级为内存态，提示“无法持久化模板，刷新后将丢失” |
| `print()` 被弹窗拦截 | 焦点变化监测，10 秒未弹出则提示“请检查浏览器弹窗拦截” |

### 6.2 安全约束（写进代码，不靠 README）

1. **CSP 元标签**：

   ```html
   <meta http-equiv="Content-Security-Policy"
     content="default-src 'self' data: blob:;
              script-src 'self' 'unsafe-inline';
              connect-src 'none';
              img-src 'self' data: blob:;
              style-src 'self' 'unsafe-inline'">
   ```

   `connect-src 'none'` 从浏览器层阻止任何 `fetch` / `XHR` / `WebSocket`，即使代码里写了也发不出去。

2. **DOM 注入安全**：用户填入的水印文字、项目名只通过 `textContent` 与 Canvas `fillText` 落地；**不走 `innerHTML`**。无外部模板引擎，没有模板注入面。

3. **模板 JSON 反序列化**：手写解析器，逐字段白名单。颜色必须匹配 `/^#[0-9a-f]{6}$/i`，数值有上下界，超出截断；未知字段直接丢弃。

   ```js
   const ALLOWED_KEYS = ['name', 'watermark', 'layout', 'filters'];
   const SHAPE = {
     watermark: ['text', 'project', 'color', 'opacity',
                 'fontSize', 'angleDeg', 'gapX', 'gapY', 'includeDate'],
     layout:    ['type', 'perPage', 'margin'],
     filters:   ['brightness', 'contrast', 'grayscale']
   };
   ```

4. **Object URL 生命周期**：每个 `URL.createObjectURL(blob)` 都登记到 `imageStore` 的清理表；`remove(id)` 或刷新前 `URL.revokeObjectURL` 释放。

5. **`<meta name="referrer" content="no-referrer">`**：防止意外的 referrer 泄漏。

6. **会话清空**：刷新即丢；可选增强是 `beforeunload` 时主动清空 `imageStore`。

### 6.3 明确不引入的库

| 库 | 不引入的原因 |
|---|---|
| helmet / secure_headers | 纯静态页，无服务端响应头可设；CSP 用 meta 已覆盖 |
| DOMPurify / Bleach | 无 HTML 输入入口；用户文本仅经 `textContent` 与 Canvas `fillText` |
| jsPDF | pdf-lib 已覆盖且 API 更现代 |
| Cropper.js | 仅用到一小部分能力，自写更可控、体积更小 |

## 7. 测试策略

### 7.1 内嵌轻量自检（`?test=1` 触发）

不依赖外部框架，覆盖纯函数模块。开发期开启，发布版去掉：

- 布局：`stack` / `side` / `multi` 三种版式的 `PagePlan` 边界值，毫米单位准确
- 实际尺寸：身份证默认 85.6×54.0、护照默认 125×88，被 PagePlan 原样使用
- `sizeMode='fixed'` 类在 multi 版式下放不进时应得到 autoPage 续页结果
- `sizeMode='fit'` 类应按槽位等比缩放，且最大不超过 `physicalSize` 100%
- 水印开关：`watermark.enabled = false` 时 `PagePlan.watermark === null`
- 模板 schema：未知字段丢弃；非法颜色回退默认值；超长文本截断
- 水印渲染：默认配置渲染的 Canvas hash 稳定
- 安全：模板列表中不应出现 `imageId` 字段

### 7.2 手动验证清单（每次发布前）

| # | 场景 | 关注点 |
|---|---|---|
| 1 | 上传身份证正反面 → stack 版式 → 默认水印 → 导出 PDF | 单页 PDF，水印完整覆盖，文件 < 2MB |
| 2 | 切换 multi 版式，`perPage = 3` → 导出 PDF | 三份均匀，每份独立水印 |
| 3 | 上传 5 个不同证件 → 多页 PDF | 页数与证件数一致，顺序正确 |
| 4 | 调整旋转 / 裁剪 / 亮度对比度 → 导出 PNG | 变换在 PNG 中保留 |
| 5 | 切换灰度复印件感 | 灰度只影响图像，水印保持指定颜色 |
| 6 | 保存模板 → 刷新 | 模板还在，证件图消失 |
| 7 | 导出模板 JSON → 改名导入 | 字段还原，校验通过 |
| 8 | 故意构造恶意 JSON（含 `<script>`、未知字段、超大数值） | 拒绝或截断，不崩溃 |
| 9 | 离线（拔网或 DevTools Offline）打开 HTML | 全功能可用 |
| 10 | DevTools Network 监控全流程 | 0 个外发请求 |
| 11 | 上传 HEIC、SVG、巨型 PNG（> 20MB） | 各自明确提示或自动降采样 |
| 12 | 直接调用系统打印 | A4 满版，水印同时印出 |
| 13 | 水印开关关闭后导出 PDF / PNG / 打印 | 三种产出均无水印；再打开开关后水印恢复 |
| 14 | 模板带水印配置 + 当前开关关闭时加载模板 | 模板加载后开关仍为关闭，不被覆盖 |
| 15 | **打印身份证后用尺子量** | 长宽分别为 85.6mm ± 0.5mm 与 54mm ± 0.5mm（取决于打印机精度，下同） |
| 16 | 打印护照内页后量 | 125mm × 88mm，长宽比保持不变 |
| 17 | 营业执照（fit 类）+ 身份证（fixed 类）同选 stack → 导出 PDF | 身份证按 85.6×54mm 渲染；营业执照按可用空间等比缩放，长宽比保留 |
| 18 | 在 multi 版式下混排 fixed + fit 类 | fixed 类槽位固定，fit 类填充剩余空间 |
| 19 | 把“学历证”手工切换为 fixed | 走自动续页逻辑，不被 fit 缩放 |

### 7.3 浏览器兼容矩阵

| 浏览器 | 版本 | 优先级 |
|---|---|---|
| Chrome / Edge | 最新两个版本 | P0 |
| Safari | 16+ | P1（HEIC 解码差异） |
| Firefox | 最新 | P1 |
| 移动端 Safari / Chrome | 最新 | P2（导出体验允许降级） |

## 8. 交付物清单

- `index.html` — 单文件应用，包含全部 CSS、JS、内嵌 pdf-lib
- `README.md` — 使用说明、隐私声明、浏览器要求
- `templates/` 三份预设模板 JSON：`投标红.json`、`灰度复印.json`、`低调灰.json`（与第 2 节“预设”对应）

## 9. 未来可演进方向（非本期）

- PWA：加 manifest + Service Worker，“安装”到桌面 / 手机
- 自动检测证件边框（需引入 OpenCV.js，体积增长大，本期不做）
- 多语言切换（默认中文）
- 服务端化部署（不做：会破坏“纯本地”承诺）
