// i18n mínim: claus per a textos generats per JS + data-i18n per al HTML.
import { CONFIG } from './config.js';
let dict = {}, fallback = {};
export let lang = CONFIG.defaultLang;

export async function initI18n() {
  const url = new URL(location.href);
  const wanted = url.searchParams.get('lang') || document.documentElement.lang || CONFIG.defaultLang;
  lang = CONFIG.languages.includes(wanted) ? wanted : CONFIG.defaultLang;
  fallback = await fetch(`i18n/${CONFIG.defaultLang}.json`).then(r => r.json());
  dict = lang === CONFIG.defaultLang ? fallback : { ...fallback, ...(await fetch(`i18n/${lang}.json`).then(r => r.json())) };
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v) el.textContent = v; });
}
export const t = (k) => dict[k] ?? fallback[k] ?? k;
export const money = (n) => new Intl.NumberFormat(t('locale'), { style: 'currency', currency: t('currency'), maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const fmtDate = (iso, opts) => new Intl.DateTimeFormat(t('locale'), opts).format(new Date(iso + 'T12:00:00'));
