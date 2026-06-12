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
    root.appendChild(field(`证件间距 ${lay.gap ?? 6} mm`, rangeInput({
      min: 0, max: 80, step: 1, value: lay.gap ?? 6,
      onInput: (v) => store.dispatch({ type: 'LAYOUT_SET', patch: { gap: Number(v) } })
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
