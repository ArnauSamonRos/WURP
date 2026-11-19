// i18n: l'idioma el marca <html lang> de cada pàgina (/, /es/, /en/).
// Les claus que falten en un idioma cauen al català.
import { CONFIG, ROOT } from './config.js';
let dict = {}, fallback = {};
export let lang = CONFIG.defaultLang;

export async function initI18n() {
  const wanted = (document.documentElement.lang || CONFIG.defaultLang).slice(0, 2);
  lang = CONFIG.languages.includes(wanted) ? wanted : CONFIG.defaultLang;
  fallback = await fetch(`${ROOT}i18n/${CONFIG.defaultLang}.json`).then(r => r.json());
  dict = lang === CONFIG.defaultLang ? fallback : { ...fallback, ...(await fetch(`${ROOT}i18n/${lang}.json`).then(r => r.json())) };
}
export const t = (k, vars) => {
  let s = dict[k] ?? fallback[k] ?? k;
  if (vars) for (const [n, v] of Object.entries(vars)) s = s.replaceAll(`{${n}}`, v);
  return s;
};
// Fusiona les traduccions d'un objecte de dades: { title, i18n: { es: { title } } }
export const loc = o => (o && o.i18n && o.i18n[lang]) ? { ...o, ...o.i18n[lang] } : o;
export const money = (n) => new Intl.NumberFormat(t('locale'), { style: 'currency', currency: t('currency'), maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const fmtDate = (iso, opts) => new Intl.DateTimeFormat(t('locale'), opts).format(new Date(iso + 'T12:00:00'));
