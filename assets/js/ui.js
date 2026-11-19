// Helpers i components reutilitzables.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const peak = (cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#peak"/></svg>`;
export const peakFrame = () => `<svg class="frame__svg" viewBox="-5 -7 84 100" aria-hidden="true"><use href="#peak"/></svg>`;

// Il·lustracions de peça (placeholder fins tenir fotos de producte).
const G = {
  tee: 'M30 18 L44 12 Q50 18 56 12 L70 18 L82 34 L72 41 L68 36 L68 88 L32 88 L32 36 L28 41 L18 34 Z',
  tank: 'M36 12 L42 12 Q50 26 58 12 L64 12 L64 30 Q68 38 68 46 L68 88 L32 88 L32 46 Q32 38 36 30 Z',
  shorts: 'M26 26 L74 26 L80 74 L56 78 L50 50 L44 78 L20 74 Z',
  tights: 'M32 10 L68 10 L70 92 L56 92 L51 38 L49 38 L44 92 L30 92 Z',
  jacket: 'M34 14 L44 10 L50 16 L56 10 L66 14 L82 30 L76 88 L64 88 L64 40 L62 90 L38 90 L36 40 L36 88 L24 88 L18 30 Z',
  hoodie: 'M38 18 Q38 6 50 6 Q62 6 62 18 L72 22 L84 40 L76 46 L70 40 L70 90 L30 90 L30 40 L24 46 L16 40 L28 22 Z',
  cap: 'M22 58 Q22 28 50 28 Q78 28 78 58 Z M14 58 L86 58 Q90 64 80 66 L22 66 Q10 64 14 58 Z',
  socks: 'M36 10 L54 10 L54 60 L74 74 Q80 84 70 88 L42 88 Q34 86 36 76 Z'
};
const MARK_Y = { cap: 40, shorts: 32, tights: 16, socks: 18, hoodie: 30 };
export function garment(type, color = '#6D1730', label = '') {
  const light = /^#(F|E)/i.test(color);
  const stroke = light ? '#6D1730' : 'rgba(244,239,234,.45)';
  const markX = type === 'socks' ? 41 : 46;
  const inner = type === 'jacket' ? `<path d="M50 16 L50 90" stroke="${stroke}" stroke-width=".8"/>` : '';
  const mark = `<path transform="translate(${markX} ${MARK_Y[type] ?? 26}) scale(.11)" d="M37 0 L74 55.5 L54.8 86 L37 59 L19.2 86 L0 55.5 Z" fill="none" stroke="${light ? '#6D1730' : '#F4EFEA'}" stroke-width="7"/>`;
  return `<svg class="garment" viewBox="0 0 100 100" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}><path d="${G[type] || G.tee}" fill="${color}" stroke="${stroke}" stroke-width=".8" stroke-linejoin="round"/>${inner}${mark}</svg>`;
}

// Diàlegs amb retorn del focus.
let lastFocus;
export function openDialog(d) { lastFocus = document.activeElement; d.showModal(); document.body.style.overflow = 'hidden'; }
export function wireDialogs() {
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', () => { document.body.style.overflow = ''; lastFocus?.focus?.(); });
  });
}

let toastT;
export function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), 2600);
}

// Enviament a un endpoint configurable (o simulat en mode demo).
export async function submitForm(form, endpoint) {
  const data = Object.fromEntries(new FormData(form));
  if (!endpoint) { await new Promise(r => setTimeout(r, 400)); console.info('[demo] formulari', data); return true; }
  const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
  return r.ok;
}
