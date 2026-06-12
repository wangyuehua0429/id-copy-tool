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

// 持久化水印、版式、滤镜设置到 localStorage
store.subscribe((state) => {
  try {
    localStorage.setItem('idcopy_watermark', JSON.stringify(state.watermark));
    localStorage.setItem('idcopy_layout', JSON.stringify(state.layout));
    localStorage.setItem('idcopy_filters', JSON.stringify(state.filters));
  } catch (_) {}
});

// 刷新前清理图片（防止 OOM）
window.addEventListener('beforeunload', () => imageStore.clear());

// ?test=1 时加载自检
if (new URL(location.href).searchParams.get('test') === '1') {
  import('./selftest.js').then(m => m.runSelfTest());
}
