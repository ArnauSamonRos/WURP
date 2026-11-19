// Capa de dades: JSON local o Google Sheets (CSV publicat). El disseny no sap d'on venen.
import { CONFIG } from './config.js';
const cache = {};

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(Boolean));
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), coerce(r[i])])));
}
function coerce(v = '') {
  v = v.trim();
  if (/^(true|sí|si)$/i.test(v)) return true;
  if (/^(false|no)$/i.test(v)) return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
// Columnes "meetup.place", "meetup.time"… es converteixen en objectes.
function nest(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (!k.includes('.')) { out[k] = v; continue; }
    const [a, b] = k.split('.'); if (v !== '') (out[a] ??= {})[b] = v;
  }
  return out;
}

export function load(name) {
  if (cache[name]) return cache[name];
  const src = CONFIG.data[name];
  cache[name] = (async () => {
    if (src.sheetCsv) {
      try { return parseCSV(await (await fetch(src.sheetCsv)).text()).map(nest); }
      catch (e) { console.warn(`Sheet ${name} no disponible, faig servir JSON`, e); }
    }
    const r = await fetch(src.json); if (!r.ok) throw new Error(`No s'ha pogut carregar ${src.json}`);
    return r.json();
  })();
  return cache[name];
}
