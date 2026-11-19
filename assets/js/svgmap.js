// Mapa SVG de Catalunya, sense dependències: zoom, arrossegar, pessic, teclat i marcadors HTML.
// Projecció a partir de data-proj del SVG (generat per scripts/gen_map.py).
export class SvgMap {
  constructor(el, { onSelect, minScale = 1, maxScale = 14 } = {}) {
    this.el = el; this.onSelect = onSelect; this.min = minScale; this.max = maxScale;
    this.s = 1; this.tx = 0; this.ty = 0; this.layers = {}; this.markers = {};
  }

  async load(url) {
    const txt = await (await fetch(url)).text();
    this.el.innerHTML = `<div class="smap__stage"><div class="smap__world">${txt}<div class="smap__pins"></div></div></div>
      <div class="smap__ctrl" role="group" aria-label="Zoom del mapa">
        <button type="button" data-z="in" aria-label="Apropa">+</button>
        <button type="button" data-z="out" aria-label="Allunya">−</button>
        <button type="button" data-z="fit" aria-label="Veure tota Catalunya" class="smap__fit"></button>
      </div>
      <div class="smap__card" hidden role="dialog" aria-live="polite"><button type="button" class="smap__close" aria-label="Tanca">×</button><div class="smap__cardbody"></div></div>`;
    this.world = this.el.querySelector('.smap__world');
    this.pins = this.el.querySelector('.smap__pins');
    this.card = this.el.querySelector('.smap__card');
    const svg = this.world.querySelector('svg');
    const vb = svg.viewBox.baseVal; this.W = vb.width; this.H = vb.height;
    [this.lon0, this.lat0, this.K, this.S] = svg.dataset.proj.split(',').map(Number);
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Mapa de Catalunya per comarques');
    this.resize(); this.bind();
    // En pantalles tàctils: un toc activa el mapa perquè no atrapi l'scroll de la pàgina
    if (matchMedia('(pointer:coarse)').matches) {
      const hint = Object.assign(document.createElement('button'), { type: 'button', className: 'map__hint', textContent: 'Toca per moure el mapa' });
      hint.addEventListener('click', () => { this.el.classList.add('is-live'); hint.remove(); });
      this.el.append(hint);
    } else this.el.classList.add('is-live');
    new ResizeObserver(() => { const c = this.center(); this.resize(); this.view(c.x, c.y, this.s, false); }).observe(this.el);
    return this;
  }

  project(lat, lng) { return { x: (lng - this.lon0) * this.K * this.S, y: (this.lat0 - lat) * this.S }; }

  resize() {
    const r = this.el.getBoundingClientRect(); this.vw = r.width; this.vh = r.height;
    this.b = Math.min(this.vw / this.W, this.vh / this.H);
    this.world.style.width = this.W * this.b + 'px'; this.world.style.height = this.H * this.b + 'px';
  }

  // Centre actual en unitats del mapa
  center() { return { x: (this.vw / 2 - this.tx) / (this.b * this.s), y: (this.vh / 2 - this.ty) / (this.b * this.s) }; }

  apply(animate) {
    const w = this.W * this.b * this.s, h = this.H * this.b * this.s;
    // Limita el desplaçament perquè el mapa no surti de la vista
    this.tx = w <= this.vw ? (this.vw - w) / 2 : Math.min(0, Math.max(this.vw - w, this.tx));
    this.ty = h <= this.vh ? (this.vh - h) / 2 : Math.min(0, Math.max(this.vh - h, this.ty));
    this.world.style.transition = animate ? 'transform .45s cubic-bezier(.2,.7,.2,1)' : 'none';
    this.world.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${this.s})`;
    this.el.style.setProperty('--inv', 1 / this.s); this.el.style.setProperty('--ks', 1 / (this.s * this.b));
    this.el.dataset.zoom = this.s > 5 ? 'hi' : this.s > 2 ? 'mid' : 'lo';
  }

  view(x, y, s, animate = true) {
    this.s = Math.min(this.max, Math.max(this.min, s));
    this.tx = this.vw / 2 - x * this.b * this.s; this.ty = this.vh / 2 - y * this.b * this.s;
    this.apply(animate);
  }

  zoomAt(px, py, f, animate) {
    const s = Math.min(this.max, Math.max(this.min, this.s * f)); f = s / this.s;
    this.tx = px - (px - this.tx) * f; this.ty = py - (py - this.ty) * f; this.s = s; this.apply(animate);
  }

  fit(points, pad = 60) {
    if (!points.length) return this.view(this.W / 2, this.H / 2, 1);
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const s = Math.min((this.vw - pad * 2) / ((x1 - x0 || 1) * this.b), (this.vh - pad * 2) / ((y1 - y0 || 1) * this.b), 9);
    this.view((x0 + x1) / 2, (y0 + y1) / 2, s);
  }

  layer(name) {
    if (!this.layers[name]) { this.layers[name] = Object.assign(document.createElement('div'), { className: `smap__layer smap__layer--${name}` }); this.pins.append(this.layers[name]); }
    return this.layers[name];
  }
  clear(name) { const l = this.layer(name); l.querySelectorAll('.smap__pin').forEach(p => delete this.markers[p.dataset.id]); l.innerHTML = ''; }
  show(name, on) { this.layer(name).hidden = !on; }

  add(name, { id, lat, lng, html, cls = '', label, popup }) {
    const { x, y } = this.project(lat, lng);
    const b = document.createElement('button');
    b.type = 'button'; b.className = `smap__pin ${cls}`; b.dataset.id = id; b.innerHTML = html;
    b.setAttribute('aria-label', label); b.title = label;
    b.style.left = (x / this.W * 100) + '%'; b.style.top = (y / this.H * 100) + '%';
    b.addEventListener('click', e => { e.stopPropagation(); this.open(id); });
    this.layer(name).append(b);
    this.markers[id] = { x, y, popup, el: b };
  }

  open(id, zoomTo) {
    const m = this.markers[id]; if (!m) return;
    if (zoomTo) this.view(m.x, m.y, Math.max(this.s, zoomTo));
    this.pins.querySelectorAll('.is-active').forEach(p => p.classList.remove('is-active'));
    m.el.classList.add('is-active');
    this.card.querySelector('.smap__cardbody').innerHTML = m.popup;
    this.card.hidden = false; this.onSelect?.(id);
  }
  closeCard() { this.card.hidden = true; this.pins.querySelectorAll('.is-active').forEach(p => p.classList.remove('is-active')); }

  bind() {
    const el = this.el, pts = new Map(); let last = null, moved = 0;
    el.querySelector('.smap__ctrl').addEventListener('click', e => {
      const z = e.target.closest('[data-z]')?.dataset.z; if (!z) return;
      if (z === 'fit') return this.view(this.W / 2, this.H / 2, 1);
      this.zoomAt(this.vw / 2, this.vh / 2, z === 'in' ? 1.6 : 1 / 1.6, true);
    });
    this.card.querySelector('.smap__close').addEventListener('click', () => this.closeCard());
    const stage = el.querySelector('.smap__stage');
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.smap__pin')) return;
      stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = null; moved = 0;
    });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = el.getBoundingClientRect();
      if (pts.size === 1) {
        this.tx += e.clientX - prev.x; this.ty += e.clientY - prev.y; moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y); this.apply(false);
      } else if (pts.size === 2) {
        const [a, c] = [...pts.values()];
        const d = Math.hypot(a.x - c.x, a.y - c.y), mx = (a.x + c.x) / 2 - r.left, my = (a.y + c.y) / 2 - r.top;
        if (last) { this.tx += mx - last.mx; this.ty += my - last.my; this.zoomAt(mx, my, d / last.d, false); }
        last = { d, mx, my }; moved = 99;
      }
    });
    const up = e => { pts.delete(e.pointerId); last = null; if (!pts.size && moved < 5 && e.type === 'pointerup') this.closeCard(); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('dblclick', e => { const r = el.getBoundingClientRect(); this.zoomAt(e.clientX - r.left, e.clientY - r.top, 2, true); });
    // Roda: només amb Ctrl/Cmd o quan el mapa té el focus, perquè no atrapi l'scroll de la pàgina
    el.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey || el.contains(document.activeElement))) return;
      e.preventDefault(); const r = el.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.002), false);
    }, { passive: false });
    // Teclat: fletxes per moure, +/- per zoom
    stage.tabIndex = 0; stage.setAttribute('aria-label', 'Mapa. Fes servir les fletxes per moure i + o − per fer zoom.');
    stage.addEventListener('keydown', e => {
      const k = e.key, step = 60;
      if (k === '+' || k === '=') this.zoomAt(this.vw / 2, this.vh / 2, 1.5, true);
      else if (k === '-') this.zoomAt(this.vw / 2, this.vh / 2, 1 / 1.5, true);
      else if (k.startsWith('Arrow')) { this.tx += k === 'ArrowLeft' ? step : k === 'ArrowRight' ? -step : 0; this.ty += k === 'ArrowUp' ? step : k === 'ArrowDown' ? -step : 0; this.apply(true); }
      else if (k === 'Escape') this.closeCard();
      else return;
      e.preventDefault();
    });
  }
}
