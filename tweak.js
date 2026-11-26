/*
 * CVAT Point Cloud Tweaker
 * Chạy trong "main world" của trang để hook WebGL (three.js) của CVAT 3D.
 * - Kích thước điểm: nhân hệ số vào uniform `size` khi vẽ POINTS.
 * - Màu điểm: ghi đè uniform `diffuse` khi vẽ POINTS (tùy chọn).
 * - Màu nền: ghi đè clearColor của WebGL (tùy chọn).
 * - Độ sáng, tương phản, gamma, bão hòa, hue, xám, đảo màu: CSS/SVG filter trên canvas WebGL.
 * Chỉ thay đổi hiển thị, KHÔNG đụng vào dữ liệu annotation.
 */
(() => {
  'use strict';
  if (window.__cvatPcTweak) return;

  const KEY = 'cvatPcTweak.v1';
  const USER_KEY = 'cvatPcTweak.user';
  const DEFAULTS = {
    size: 1, brightness: 1, contrast: 1, gamma: 1, saturate: 1, hue: 0, grayscale: 0, invert: false,
    tintOn: false, tint: '#ffffff', bgOn: false, bg: '#000000',
    heightOn: false, hMin: -2, hMax: 4,
    panelOpen: false, advOpen: false,
  };
  const PRESETS = {
    'Mặc định': {},
    'Rõ nét': { size: 1.6, brightness: 1.6, contrast: 1.3, gamma: 0.8 },
    'Điểm thưa (LiDAR 32 tia)': { size: 2.2, brightness: 1.8, contrast: 1.2, gamma: 0.7 },
    'Nền trắng': { size: 1.6, contrast: 1.2, invert: true, hue: 180 },
  };
  const S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  const seenUniforms = new Set();
  const locName = new WeakMap();   // location -> 'size' | 'diffuse'
  const progLoc = new WeakMap();   // program  -> { size, diffuse }
  const baseVal = new WeakMap();   // location -> giá trị gốc three.js đặt

  // Shader tô màu theo độ cao (trục z của point cloud, đơn vị mét): xanh dương (thấp) -> đỏ (cao).
  let heightInjected = false;
  const HEIGHT_DECL =
    'uniform float pctOn;\nuniform float pctMin;\nuniform float pctMax;\n' +
    'vec3 pctRamp(float t){ t=clamp(t,0.0,1.0); float h=(1.0-t)*0.72;' +
    ' return clamp(abs(fract(vec3(h)+vec3(1.0,0.6666667,0.3333333))*6.0-3.0)-1.0,0.0,1.0); }\n';
  const injectHeight = (src) => {
    if (typeof src !== 'string' || src.indexOf('gl_PointSize') < 0 || src.indexOf('vColor') < 0) return src;
    if (src.indexOf('pctRamp') >= 0) return src;
    const m = /gl_Position\s*=\s*projectionMatrix\s*\*\s*mvPosition\s*;/.exec(src);
    const mainAt = src.search(/void\s+main\s*\(/);
    if (!m || mainAt < 0) return src;
    const isVec4 = /(varying|out)\s+vec4\s+vColor/.test(src);
    const assign = isVec4
      ? 'vColor = vec4(pctRamp((position.z - pctMin) / (pctMax - pctMin)), 1.0);'
      : 'vColor = pctRamp((position.z - pctMin) / (pctMax - pctMin));';
    const body = `${m[0]}\n  if (pctOn > 0.5) { ${assign} }`;
    let out = src.slice(0, m.index) + body + src.slice(m.index + m[0].length);
    out = out.slice(0, mainAt) + HEIGHT_DECL + out.slice(mainAt);
    heightInjected = true;
    return out;
  };

  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  function patchContext(proto) {
    if (!proto || proto.__pctPatched) return;
    proto.__pctPatched = true;
    const o = {};
    ['getUniformLocation', 'useProgram', 'uniform1f', 'uniform3f', 'uniform3fv',
      'drawArrays', 'drawElements', 'clearColor', 'clear', 'shaderSource']
      .forEach((n) => { o[n] = proto[n]; });

    proto.shaderSource = function (shader, source) {
      let src = source;
      try { src = injectHeight(source); } catch (e) { src = source; }
      return o.shaderSource.call(this, shader, src);
    };

    proto.getUniformLocation = function (program, name) {
      const loc = o.getUniformLocation.call(this, program, name);
      if (loc) {
        seenUniforms.add(name);
        if (name === 'size' || name === 'diffuse' || name === 'pctOn' || name === 'pctMin' || name === 'pctMax') {
          locName.set(loc, name);
          let e = progLoc.get(program);
          if (!e) { e = {}; progLoc.set(program, e); }
          e[name] = loc;
        }
      }
      return loc;
    };

    proto.useProgram = function (p) {
      this.__pctProg = p;
      return o.useProgram.call(this, p);
    };

    proto.uniform1f = function (loc, v) {
      if (locName.get(loc) === 'size') {
        baseVal.set(loc, v);
        return o.uniform1f.call(this, loc, v * S.size);
      }
      return o.uniform1f.call(this, loc, v);
    };

    // Chỉ ghi nhớ giá trị gốc của `diffuse`. Việc đổi màu chỉ xảy ra khi vẽ point cloud
    // (xem applyBeforePoints), để không làm đổi màu cuboid hay các vật khác dùng cùng tên uniform.
    proto.uniform3f = function (loc, x, y, z) {
      if (locName.get(loc) === 'diffuse') baseVal.set(loc, [x, y, z]);
      return o.uniform3f.call(this, loc, x, y, z);
    };

    proto.uniform3fv = function (loc, arr, ...rest) {
      if (locName.get(loc) === 'diffuse') baseVal.set(loc, [arr[0], arr[1], arr[2]]);
      return o.uniform3fv.call(this, loc, arr, ...rest);
    };

    // Màu nền: nhớ clearColor gốc, ghi đè ngay trước mỗi lần clear.
    proto.clearColor = function (r, g, b, a) {
      this.__pctClear = [r, g, b, a];
      if (S.bgOn) {
        const c = hexToRgb(S.bg);
        return o.clearColor.call(this, c[0], c[1], c[2], a);
      }
      return o.clearColor.call(this, r, g, b, a);
    };
    proto.clear = function (mask) {
      if ((mask & this.COLOR_BUFFER_BIT) && this.__pctClear) {
        const base = this.__pctClear;
        const c = S.bgOn ? hexToRgb(S.bg) : base;
        o.clearColor.call(this, c[0], c[1], c[2], base[3]);
      }
      return o.clear.call(this, mask);
    };

    // Trước mỗi lần vẽ POINTS, áp lại cấu hình hiện tại để slider có hiệu lực ngay.
    // Chỉ coi là point cloud khi số điểm đủ lớn, tránh đổi màu các Points nhỏ (tay cầm, helper...).
    const MIN_CLOUD_POINTS = 1000;
    const applyBeforePoints = (gl, count) => {
      const e = progLoc.get(gl.__pctProg);
      if (!e) return;
      if (e.size && baseVal.has(e.size)) {
        o.uniform1f.call(gl, e.size, baseVal.get(e.size) * S.size);
      }
      if (e.pctOn && e.pctMin && e.pctMax) {
        o.uniform1f.call(gl, e.pctOn, S.heightOn ? 1 : 0);
        o.uniform1f.call(gl, e.pctMin, S.hMin);
        o.uniform1f.call(gl, e.pctMax, Math.max(S.hMax, S.hMin + 0.01));
      }
      if (e.diffuse && baseVal.has(e.diffuse)) {
        const tint = S.tintOn && !S.heightOn && count >= MIN_CLOUD_POINTS;
        const c = tint ? hexToRgb(S.tint) : baseVal.get(e.diffuse);
        o.uniform3f.call(gl, e.diffuse, c[0], c[1], c[2]);
      }
    };

    proto.drawArrays = function (mode, first, count) {
      if (mode === this.POINTS) applyBeforePoints(this, count);
      return o.drawArrays.call(this, mode, first, count);
    };
    proto.drawElements = function (mode, count, type, offset) {
      if (mode === this.POINTS) applyBeforePoints(this, count);
      return o.drawElements.call(this, mode, count, type, offset);
    };
  }

  if (window.WebGLRenderingContext) patchContext(WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext) patchContext(WebGL2RenderingContext.prototype);

  // Đánh dấu canvas WebGL để chỉ áp CSS filter lên chúng (không đụng tới ảnh camera 2D).
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = origGetContext.call(this, type, ...rest);
    if (ctx && /webgl/i.test(String(type))) this.setAttribute('data-pct', '1');
    return ctx;
  };

  const style = document.createElement('style');
  const filterString = () => {
    const parts = [];
    if (S.gamma !== 1) parts.push('url(#pct-gamma)');
    parts.push(`brightness(${S.brightness})`, `contrast(${S.contrast})`, `saturate(${S.saturate})`);
    if (S.hue) parts.push(`hue-rotate(${S.hue}deg)`);
    if (S.grayscale) parts.push(`grayscale(${S.grayscale})`);
    if (S.invert) parts.push('invert(1)');
    return parts.join(' ');
  };
  const applyCss = () => {
    style.textContent =
      `canvas[data-pct]{filter:${filterString()};}` +
      '#pct-btn{position:fixed;left:8px;bottom:8px;z-index:2147483646;width:34px;height:34px;border-radius:50%;' +
      'border:1px solid #888;background:#222;color:#fff;font:600 12px sans-serif;cursor:pointer;opacity:.8}' +
      '#pct-btn:hover{opacity:1}' +
      '#pct-panel{position:fixed;left:8px;bottom:50px;z-index:2147483646;width:260px;max-height:75vh;overflow:auto;' +
      'padding:10px 12px;background:rgba(25,25,25,.95);color:#eee;font:12px sans-serif;border:1px solid #666;' +
      'border-radius:6px;display:none}' +
      '#pct-panel label{display:block;margin:7px 0 2px}' +
      '#pct-panel input[type=range]{width:100%}' +
      '#pct-panel select{width:100%;background:#333;color:#fff;border:1px solid #777;border-radius:4px;padding:2px}' +
      '#pct-panel .row{display:flex;align-items:center;gap:8px;margin-top:8px}' +
      '#pct-panel .row label{margin:0}' +
      '#pct-panel button{background:#444;color:#fff;border:1px solid #777;border-radius:4px;padding:3px 8px;cursor:pointer}';
    const g = document.getElementById('pct-gamma-fn');
    if (g) g.querySelectorAll('feFuncR,feFuncG,feFuncB').forEach((f) => f.setAttribute('exponent', S.gamma));
  };

  // Một số trang chỉ vẽ khi có sự kiện; resize giúp CVAT render lại.
  const nudge = () => { try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ } };
  const changed = () => { save(); applyCss(); nudge(); };

  const SLIDERS = [
    // g: basic = luôn hiện; height = chỉ hiện khi bật màu theo độ cao; adv = nằm trong mục "Nâng cao" (mặc định đóng)
    { g: 'basic', k: 'size', label: 'Kích thước điểm', min: 0.3, max: 8, step: 0.1, fmt: (v) => '×' + v.toFixed(1) },
    { g: 'basic', k: 'brightness', label: 'Độ sáng', min: 0.3, max: 4, step: 0.05, fmt: (v) => v.toFixed(2) },
    { g: 'basic', k: 'contrast', label: 'Tương phản', min: 0.3, max: 4, step: 0.05, fmt: (v) => v.toFixed(2) },
    { g: 'height', k: 'hMin', label: 'Độ cao thấp nhất (xanh dương)', min: -10, max: 10, step: 0.1, fmt: (v) => v.toFixed(1) + ' m' },
    { g: 'height', k: 'hMax', label: 'Độ cao cao nhất (đỏ)', min: -5, max: 20, step: 0.1, fmt: (v) => v.toFixed(1) + ' m' },
    { g: 'adv', k: 'gamma', label: 'Gamma (nhỏ = sáng vùng tối)', min: 0.3, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) },
    { g: 'adv', k: 'saturate', label: 'Độ bão hòa màu', min: 0, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) },
    { g: 'adv', k: 'hue', label: 'Xoay sắc độ (hue)', min: 0, max: 360, step: 5, fmt: (v) => v + '°' },
    { g: 'adv', k: 'grayscale', label: 'Thang xám', min: 0, max: 1, step: 0.05, fmt: (v) => v.toFixed(2) },
  ];
  const sliderHtml = (g) => SLIDERS.filter((s) => s.g === g).map((s) =>
    `<label>${s.label}: <span id="pct-${s.k}-v"></span></label>` +
    `<input id="pct-${s.k}" type="range" min="${s.min}" max="${s.max}" step="${s.step}">`).join('');

  function buildUi() {
    const svgHolder = document.createElement('div');
    svgHolder.innerHTML =
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="pct-gamma" ' +
      'color-interpolation-filters="sRGB"><feComponentTransfer id="pct-gamma-fn">' +
      '<feFuncR type="gamma" amplitude="1" exponent="1" offset="0"/>' +
      '<feFuncG type="gamma" amplitude="1" exponent="1" offset="0"/>' +
      '<feFuncB type="gamma" amplitude="1" exponent="1" offset="0"/>' +
      '</feComponentTransfer></filter></svg>';
    document.body.appendChild(svgHolder.firstChild);

    const btn = document.createElement('button');
    btn.id = 'pct-btn';
    btn.textContent = 'PC';
    btn.title = 'Point Cloud Tweaker (Alt+Shift+P)';

    const panel = document.createElement('div');
    panel.id = 'pct-panel';
    const presetOptions = Object.keys(PRESETS).map((n) => `<option>${n}</option>`).join('');
    panel.innerHTML =
      '<b>Point Cloud Tweaker</b>' +
      '<label>Preset</label><select id="pct-preset"><option value="">— chọn —</option>' + presetOptions + '</select>' +
      sliderHtml('basic') +
      '<div class="row"><input id="pct-heightOn" type="checkbox"><label for="pct-heightOn">Tô màu theo độ cao</label>' +
      '<span id="pct-hstat" style="color:#f90"></span></div>' +
      '<div id="pct-hrange">' + sliderHtml('height') + '</div>' +
      '<div class="row"><button id="pct-advbtn"></button></div>' +
      '<div id="pct-adv">' + sliderHtml('adv') +
      '<div class="row"><input id="pct-invert" type="checkbox"><label for="pct-invert">Đảo màu (nền trắng)</label></div>' +
      '<div class="row"><input id="pct-tintOn" type="checkbox"><label for="pct-tintOn">Đổi màu điểm</label>' +
      '<input id="pct-tint" type="color"></div>' +
      '<div class="row"><input id="pct-bgOn" type="checkbox"><label for="pct-bgOn">Đổi màu nền</label>' +
      '<input id="pct-bg" type="color"></div>' +
      '<div class="row"><button id="pct-usave">Lưu của tôi</button><button id="pct-uload">Tải của tôi</button>' +
      '<button id="pct-dump">Log uniform</button></div></div>' +
      '<div class="row"><button id="pct-reset">Đặt lại</button></div>';

    const $ = (id) => panel.querySelector('#' + id);
    const sync = () => {
      SLIDERS.forEach((s) => {
        $('pct-' + s.k).value = S[s.k];
        $('pct-' + s.k + '-v').textContent = s.fmt(Number(S[s.k]));
      });
      $('pct-hrange').style.display = S.heightOn ? 'block' : 'none';
      $('pct-adv').style.display = S.advOpen ? 'block' : 'none';
      $('pct-advbtn').textContent = S.advOpen ? '▾ Ẩn nâng cao' : '▸ Nâng cao';
      $('pct-heightOn').checked = !!S.heightOn;
      $('pct-hstat').textContent = S.heightOn && !heightInjected ? '(chưa hỗ trợ)' : '';
      $('pct-invert').checked = !!S.invert;
      $('pct-tintOn').checked = !!S.tintOn; $('pct-tint').value = S.tint;
      $('pct-bgOn').checked = !!S.bgOn; $('pct-bg').value = S.bg;
      panel.style.display = S.panelOpen ? 'block' : 'none';
    };

    SLIDERS.forEach((s) => {
      $('pct-' + s.k).addEventListener('input', (e) => { S[s.k] = parseFloat(e.target.value); sync(); changed(); });
    });
    $('pct-advbtn').addEventListener('click', () => { S.advOpen = !S.advOpen; sync(); save(); });
    $('pct-heightOn').addEventListener('change', (e) => { S.heightOn = e.target.checked; sync(); changed(); });
    $('pct-invert').addEventListener('change', (e) => { S.invert = e.target.checked; changed(); });
    $('pct-tintOn').addEventListener('change', (e) => { S.tintOn = e.target.checked; changed(); });
    $('pct-tint').addEventListener('input', (e) => { S.tint = e.target.value; changed(); });
    $('pct-bgOn').addEventListener('change', (e) => { S.bgOn = e.target.checked; changed(); });
    $('pct-bg').addEventListener('input', (e) => { S.bg = e.target.value; changed(); });

    $('pct-preset').addEventListener('change', (e) => {
      const p = PRESETS[e.target.value];
      if (!p) return;
      Object.assign(S, DEFAULTS, p, { panelOpen: true, advOpen: S.advOpen });
      sync(); changed();
    });
    $('pct-reset').addEventListener('click', () => {
      Object.assign(S, DEFAULTS, { panelOpen: true, advOpen: S.advOpen });
      $('pct-preset').value = ''; sync(); changed();
    });
    $('pct-usave').addEventListener('click', () => {
      try { localStorage.setItem(USER_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    });
    $('pct-uload').addEventListener('click', () => {
      try {
        const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        if (u) { Object.assign(S, DEFAULTS, u, { panelOpen: true, advOpen: S.advOpen }); sync(); changed(); }
      } catch (e) { /* ignore */ }
    });
    $('pct-dump').addEventListener('click', () => {
      console.log('[PC Tweaker] uniform đã thấy:', Array.from(seenUniforms).sort());
    });

    const toggle = () => { S.panelOpen = !S.panelOpen; sync(); save(); };
    btn.addEventListener('click', toggle);
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyP') { e.preventDefault(); toggle(); }
    }, true);
    // Không để phím gõ trong panel kích hoạt phím tắt của CVAT.
    ['keydown', 'keyup', 'keypress'].forEach((t) => panel.addEventListener(t, (e) => e.stopPropagation()));

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    sync();
    applyCss();
  }

  applyCss();
  (document.head || document.documentElement).appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi);
  else buildUi();

  window.__cvatPcTweak = {
    settings: S,
    dump: () => Array.from(seenUniforms).sort(),
  };
})();
