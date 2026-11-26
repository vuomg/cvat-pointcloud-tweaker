/*
 * CVAT Point Cloud Tweaker
 * Chạy trong "main world" của trang để hook WebGL (three.js) của CVAT 3D.
 * - Kích thước điểm: nhân hệ số vào uniform `size` khi vẽ POINTS.
 * - Màu điểm: ghi đè uniform `diffuse` khi vẽ POINTS (tùy chọn).
 * - Độ sáng / tương phản: CSS filter trên các canvas WebGL.
 * Chỉ thay đổi hiển thị, KHÔNG đụng vào dữ liệu annotation.
 */
(() => {
  'use strict';
  if (window.__cvatPcTweak) return;

  const KEY = 'cvatPcTweak.v1';
  const DEFAULTS = { size: 1, brightness: 1, contrast: 1, tintOn: false, tint: '#ffffff', panelOpen: false };
  const S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  const seenUniforms = new Set();
  const locName = new WeakMap();   // location -> 'size' | 'diffuse'
  const progLoc = new WeakMap();   // program  -> { size, diffuse }
  const baseVal = new WeakMap();   // location -> giá trị gốc three.js đặt

  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  function patchContext(proto) {
    if (!proto || proto.__pctPatched) return;
    proto.__pctPatched = true;
    const o = {};
    ['getUniformLocation', 'useProgram', 'uniform1f', 'uniform3f', 'uniform3fv', 'drawArrays', 'drawElements']
      .forEach((n) => { o[n] = proto[n]; });

    proto.getUniformLocation = function (program, name) {
      const loc = o.getUniformLocation.call(this, program, name);
      if (loc) {
        seenUniforms.add(name);
        if (name === 'size' || name === 'diffuse') {
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

    proto.uniform3f = function (loc, x, y, z) {
      if (locName.get(loc) === 'diffuse') {
        baseVal.set(loc, [x, y, z]);
        if (S.tintOn) {
          const c = hexToRgb(S.tint);
          return o.uniform3f.call(this, loc, c[0], c[1], c[2]);
        }
      }
      return o.uniform3f.call(this, loc, x, y, z);
    };

    proto.uniform3fv = function (loc, arr, ...rest) {
      if (locName.get(loc) === 'diffuse') {
        baseVal.set(loc, [arr[0], arr[1], arr[2]]);
        if (S.tintOn) {
          const c = hexToRgb(S.tint);
          return o.uniform3f.call(this, loc, c[0], c[1], c[2]);
        }
      }
      return o.uniform3fv.call(this, loc, arr, ...rest);
    };

    // Trước mỗi lần vẽ POINTS, áp lại cấu hình hiện tại để slider có hiệu lực ngay.
    const applyBeforePoints = (gl) => {
      const e = progLoc.get(gl.__pctProg);
      if (!e) return;
      if (e.size && baseVal.has(e.size)) {
        o.uniform1f.call(gl, e.size, baseVal.get(e.size) * S.size);
      }
      if (e.diffuse && baseVal.has(e.diffuse)) {
        const c = S.tintOn ? hexToRgb(S.tint) : baseVal.get(e.diffuse);
        o.uniform3f.call(gl, e.diffuse, c[0], c[1], c[2]);
      }
    };

    proto.drawArrays = function (mode, first, count) {
      if (mode === this.POINTS) applyBeforePoints(this);
      return o.drawArrays.call(this, mode, first, count);
    };
    proto.drawElements = function (mode, count, type, offset) {
      if (mode === this.POINTS) applyBeforePoints(this);
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
  const applyCss = () => {
    style.textContent =
      `canvas[data-pct]{filter:brightness(${S.brightness}) contrast(${S.contrast});}` +
      '#pct-btn{position:fixed;left:8px;bottom:8px;z-index:2147483646;width:34px;height:34px;border-radius:50%;' +
      'border:1px solid #888;background:#222;color:#fff;font:600 12px sans-serif;cursor:pointer;opacity:.8}' +
      '#pct-btn:hover{opacity:1}' +
      '#pct-panel{position:fixed;left:8px;bottom:50px;z-index:2147483646;width:240px;padding:10px 12px;' +
      'background:rgba(25,25,25,.95);color:#eee;font:12px sans-serif;border:1px solid #666;border-radius:6px;display:none}' +
      '#pct-panel label{display:block;margin:8px 0 2px}' +
      '#pct-panel input[type=range]{width:100%}' +
      '#pct-panel .row{display:flex;align-items:center;gap:8px;margin-top:8px}' +
      '#pct-panel button{background:#444;color:#fff;border:1px solid #777;border-radius:4px;padding:3px 8px;cursor:pointer}';
  };

  // Một số trang chỉ vẽ khi có sự kiện; resize giúp CVAT render lại.
  const nudge = () => { try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ } };
  const changed = () => { save(); applyCss(); nudge(); };

  function buildUi() {
    const btn = document.createElement('button');
    btn.id = 'pct-btn';
    btn.textContent = 'PC';
    btn.title = 'Point Cloud Tweaker (Alt+Shift+P)';

    const panel = document.createElement('div');
    panel.id = 'pct-panel';
    panel.innerHTML =
      '<b>Point Cloud Tweaker</b>' +
      '<label>Kích thước điểm: <span id="pct-size-v"></span></label>' +
      '<input id="pct-size" type="range" min="0.3" max="6" step="0.1">' +
      '<label>Độ sáng: <span id="pct-br-v"></span></label>' +
      '<input id="pct-br" type="range" min="0.3" max="3" step="0.05">' +
      '<label>Tương phản: <span id="pct-ct-v"></span></label>' +
      '<input id="pct-ct" type="range" min="0.3" max="3" step="0.05">' +
      '<div class="row"><input id="pct-tint-on" type="checkbox"><label style="margin:0" for="pct-tint-on">Đổi màu điểm</label>' +
      '<input id="pct-tint" type="color"></div>' +
      '<div class="row"><button id="pct-reset">Đặt lại</button><button id="pct-dump">Log uniform</button></div>';

    const $ = (id) => panel.querySelector('#' + id);
    const sync = () => {
      $('pct-size').value = S.size; $('pct-size-v').textContent = '×' + Number(S.size).toFixed(1);
      $('pct-br').value = S.brightness; $('pct-br-v').textContent = Number(S.brightness).toFixed(2);
      $('pct-ct').value = S.contrast; $('pct-ct-v').textContent = Number(S.contrast).toFixed(2);
      $('pct-tint-on').checked = S.tintOn; $('pct-tint').value = S.tint;
      panel.style.display = S.panelOpen ? 'block' : 'none';
    };

    $('pct-size').addEventListener('input', (e) => { S.size = parseFloat(e.target.value); sync(); changed(); });
    $('pct-br').addEventListener('input', (e) => { S.brightness = parseFloat(e.target.value); sync(); changed(); });
    $('pct-ct').addEventListener('input', (e) => { S.contrast = parseFloat(e.target.value); sync(); changed(); });
    $('pct-tint-on').addEventListener('change', (e) => { S.tintOn = e.target.checked; changed(); });
    $('pct-tint').addEventListener('input', (e) => { S.tint = e.target.value; changed(); });
    $('pct-reset').addEventListener('click', () => { Object.assign(S, DEFAULTS, { panelOpen: true }); sync(); changed(); });
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
