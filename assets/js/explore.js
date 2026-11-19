// Carreres i clubs: carrera del mes, mapa SVG de Catalunya (càrrega diferida), llistes i formulari.
import { load } from './data.js';
import { CONFIG } from './config.js';
import { t, fmtDate } from './i18n.js';
import { $, esc, peak, openDialog, submitForm, toast } from './ui.js';
import { SvgMap } from './svgmap.js';

let races = [], clubs = [], map;

const monthKey = iso => iso.slice(0, 7);
const kmLabel = n => n === 42.2 || n === 42.195 ? 'Marató' : n === 21.1 || n === 21.0975 ? 'Mitja' : n < 1 ? `${Math.round(n * 1000)} m` : `${String(+n.toFixed(1)).replace('.', ',')}K`;
const badge = () => `<span class="challenge-badge">${peak()}Repte WURP</span>`;
const RTYPE = { asfalt: 'Asfalt', trail: 'Trail', cros: 'Cros', multi: 'Multiesport' };
const inDcat = (k, c) => c === '5k' ? k <= 5 : c === '10k' ? k > 5 && k <= 10 : c === 'half' ? k > 10 && k <= 21.1 : c === 'marathon' ? k > 21.1 && k <= 42.2 : k > 42.2;
const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const TODAY = new Date(new Date().toDateString());
const daysTo = iso => Math.round((new Date(iso + 'T00:00:00') - TODAY) / 864e5);
const countdown = iso => { const d = daysTo(iso); return d < 0 ? 'Ja s\'ha fet' : d === 0 ? 'Avui' : d === 1 ? 'Demà' : d < 60 ? `Falten ${d} dies` : `D'aquí ${Math.round(d / 30)} mesos`; };
const cap = s => s[0].toUpperCase() + s.slice(1);

function regPill(r) {
  if (!r.registration) return '';
  return `<span class="rpill rpill--${r.registration.status}">${esc(r.registration.label)}</span>`;
}

function featured() {
  const r = races.find(x => x.featured) || races.find(x => x.type === 'asfalt'); if (!r) return;
  $('#featuredRace').innerHTML = `
    <div class="featured-race__label">${peak()}<p id="featured-title">Carrera WURP<br>del mes</p><span class="featured-race__count">${countdown(r.date)}</span></div>
    <div class="featured-race__body">
      <div>
        <p class="eyebrow" style="margin-bottom:10px">${cap(fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(r.town)}</p>
        <h3>${esc(r.name)}</h3>
      </div>
      <dl class="stats">
        <div class="stat"><dt>Distàncies</dt><dd>${r.distances.map(kmLabel).join(' · ') || '—'}</dd></div>
        <div class="stat"><dt>Tipus</dt><dd>${RTYPE[r.type]}</dd></div>
      </dl>
      ${r.meetup ? `<div class="meetup"><strong>Quedada WURP · ${esc(r.meetup.time)} · ${esc(r.meetup.place)}</strong><p>${esc(r.meetup.note || '')}</p></div>` : ''}
      <div class="featured-race__ctas">
        <button class="btn" type="button" data-race="${r.id}">Veure la cursa</button>
        <a class="btn btn--outline" href="${esc(r.url)}" target="_blank" rel="noopener">Inscripció<span class="sr-only"> (pestanya nova)</span></a>
      </div>
    </div>`;
}

function filteredRaces() {
  const f = Object.fromEntries(new FormData($('#raceFilters')));
  const q = strip(f.q || '').trim();
  return races.filter(r => daysTo(r.endDate || r.date) >= 0
    && (!f.month || monthKey(r.date) === f.month)
    && (!f.dcat || r.distances.some(k => inDcat(k, f.dcat)))
    && (!f.rtype || r.type === f.rtype)
    && (!q || strip(r.name + ' ' + r.town).includes(q)));
}

function raceCard(r) {
  const d = new Date(r.date + 'T12:00:00');
  return `<li class="rc rc--${r.type}${r.featured ? ' rc--featured' : ''}">
    <button type="button" class="rc__hit" data-race="${r.id}" aria-label="${esc(r.name)}, ${fmtDate(r.date, { day: 'numeric', month: 'long' })}, ${esc(r.town)}. Veure la fitxa"></button>
    <div class="rc__top">
      <div class="rc__date" aria-hidden="true"><span class="rc__day">${d.getDate()}</span><span class="rc__wd">${fmtDate(r.date, { weekday: 'short' }).replace('.', '')}<br>${fmtDate(r.date, { month: 'short' }).replace('.', '')}</span></div>
      <div class="rc__flags"><span class="rc__type">${RTYPE[r.type]}</span><span class="rc__count">${countdown(r.date)}</span></div>
    </div>
    <h4 class="rc__name">${esc(r.name)}</h4>
    <p class="rc__town"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="2" fill="currentColor"/></svg>${esc(r.town)}</p>
    ${r.distances.length ? `<ul class="rc__dist" aria-label="Distàncies">${r.distances.slice(0, 5).map(k => `<li>${kmLabel(k)}</li>`).join('')}${r.distances.length > 5 ? `<li>+${r.distances.length - 5}</li>` : ''}</ul>` : ''}
    <div class="rc__foot">
      ${r.challenge ? badge() : ''}${r.featured ? '<span class="rpill rpill--wurp">Quedada WURP</span>' : ''}${regPill(r)}
      ${r.elevation ? `<span class="rc__meta">D+ ${esc(r.elevation)}</span>` : ''}${r.price ? `<span class="rc__meta">${esc(r.price)}</span>` : ''}
      <span class="rc__arrow" aria-hidden="true">→</span>
    </div>
  </li>`;
}

let raceLimit = 12;
function renderRaces() {
  const list = filteredRaces();
  const shown = list.slice(0, raceLimit);
  const groups = {};
  shown.forEach(r => (groups[monthKey(r.date)] ??= []).push(r));
  $('#raceList').innerHTML = shown.length ? Object.entries(groups).map(([m, rs]) => `
    <section class="rgroup" aria-label="${cap(fmtDate(m + '-01', { month: 'long', year: 'numeric' }))}">
      <h4 class="rgroup__h"><span>${cap(fmtDate(m + '-01', { month: 'long' }))}</span> <small>${m.slice(0, 4)}</small><em>${list.filter(r => monthKey(r.date) === m).length} curses</em></h4>
      <ul class="rgrid">${rs.map(raceCard).join('')}</ul>
    </section>`).join('') : `<p class="empty">Cap cursa amb aquests filtres. Prova amb un altre mes o distància.</p>`;
  $('#raceCount').textContent = `${list.length} curses`;
  const more = $('#raceMore');
  more.hidden = list.length <= raceLimit;
  more.textContent = `Veure'n més (${list.length - raceLimit} restants)`;
  if (map) drawRaces(list);
}

/* ---------- Fitxa de cursa ---------- */
let mapProj;
async function proj() {
  if (mapProj) return mapProj;
  const txt = await (await fetch(CONFIG.map.svg)).text();
  const m = txt.match(/viewBox="0 0 (\d+) (\d+)" data-proj="([^"]+)"/);
  const [lon0, lat0, K, S] = m[3].split(',').map(Number);
  return (mapProj = { W: +m[1], H: +m[2], lon0, lat0, K, S });
}

function icsFor(r) {
  const d = r.date.replace(/-/g, ''), e = new Date((r.endDate || r.date) + 'T12:00:00'); e.setDate(e.getDate() + 1);
  const end = e.toISOString().slice(0, 10).replace(/-/g, '');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WURP//Curses//CA', 'BEGIN:VEVENT', `UID:${r.id}@wurp`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${r.name}`, `LOCATION:${r.town}`, `URL:${r.url}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
}

async function openRace(id) {
  const r = races.find(x => x.id === id); if (!r) return;
  const p = await proj().catch(() => null);
  const pos = p && { x: (r.lng - p.lon0) * p.K * p.S / p.W * 100, y: (p.lat0 - r.lat) * p.S / p.H * 100 };
  const when = r.endDate ? `${fmtDate(r.date, { day: 'numeric', month: 'long' })} – ${fmtDate(r.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}` : cap(fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  $('#raceModalBody').innerHTML = `
    <header class="rm__hero rm__hero--${r.type}">
      <button class="modal__close" data-close aria-label="Tanca la fitxa">×</button>
      <div class="rm__hero-in">
        <div class="rm__date" aria-hidden="true"><span>${new Date(r.date + 'T12:00:00').getDate()}</span>${fmtDate(r.date, { month: 'short' }).replace('.', '')}</div>
        <div>
          <p class="rm__kicker">${RTYPE[r.type]} · ${countdown(r.date)}</p>
          <h2 id="rm-title">${esc(r.name)}</h2>
          <p class="rm__when">${when} · ${esc(r.town)}</p>
        </div>
      </div>
      <svg class="rm__peak" aria-hidden="true"><use href="#peak"/></svg>
    </header>
    <div class="rm__body">
      <div class="rm__main">
        ${r.distances.length ? `<h3 class="rm__h">Distàncies</h3><ul class="rm__dist">${r.distances.map(k => `<li><strong>${kmLabel(k)}</strong>${k >= 1 && !['Mitja', 'Marató'].includes(kmLabel(k)) ? '' : ''}</li>`).join('')}</ul>` : ''}
        <dl class="rm__stats">
          <div><dt>Data</dt><dd>${fmtDate(r.date, { day: 'numeric', month: 'short' })}</dd></div>
          <div><dt>Tipus</dt><dd>${RTYPE[r.type]}</dd></div>
          <div><dt>Desnivell</dt><dd>${r.elevation ? esc(r.elevation) : '—'}</dd></div>
          <div><dt>Preu</dt><dd>${r.price ? esc(r.price) : 'Consulta la web'}</dd></div>
        </dl>
        ${r.registration ? `<p class="rm__reg">${regPill(r)}</p>` : ''}
        ${r.challenge ? `<div class="rm__note">${peak()}<div><strong>Té un repte WURP associat.</strong> Corre-la i suma per aconseguir la peça exclusiva. <a href="#reptes" data-close>Veure el repte</a></div></div>` : ''}
        ${r.meetup ? `<div class="rm__note rm__note--meet"><div><strong>Quedada WURP · ${esc(r.meetup.time)} · ${esc(r.meetup.place)}</strong><br>${esc(r.meetup.note)}</div></div>` : ''}
        <div class="rm__ctas">
          <a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">${r.registration?.status === 'soldout' ? 'Web oficial' : 'Web oficial i inscripció'}<span class="sr-only"> (pestanya nova)</span></a>
          <a class="btn btn--outline" href="${icsFor(r)}" download="${r.id}.ics">Afegeix al calendari</a>
          <button class="btn btn--outline" type="button" data-share="${r.id}">Comparteix</button>
        </div>
      </div>
      <aside class="rm__where">
        <h3 class="rm__h">On és</h3>
        ${pos ? `<div class="rm__mini"><img src="${CONFIG.map.svg}" alt="" width="1000" height="996"><span class="rm__dot" style="left:${pos.x}%;top:${pos.y}%"></span></div>` : ''}
        <p class="rm__town">${esc(r.town)}</p>
        <button type="button" class="link-arrow" data-locate="${r.id}" data-close>Veure al mapa</button>
      </aside>
    </div>
    <p class="rm__src">Dades recollides de fonts públiques. Confirma horaris i preus a la web oficial.</p>`;
  const dlg = $('#raceModal');
  if (!dlg.open) openDialog(dlg);
  history.replaceState(null, '', '#cursa=' + r.id);
}

async function share(id) {
  const r = races.find(x => x.id === id);
  const url = location.href.split('#')[0] + '#cursa=' + id;
  try {
    if (navigator.share) await navigator.share({ title: r.name, text: `${r.name} · ${fmtDate(r.date, { day: 'numeric', month: 'long' })}`, url });
    else { await navigator.clipboard.writeText(url); toast('Enllaç copiat'); }
  } catch {}
}

const CLUB_TYPE = { social: 'Social', marca: 'Marca / botiga', federat: 'Federat' };
let showAllClubs = false;
const PAGE = 9;

function filteredClubs() {
  const f = Object.fromEntries(new FormData($('#clubFilters')));
  return clubs.filter(c => (!f.ctype || c.type === f.ctype) && (!f.town || c.town === f.town));
}

function clubCard(c) {
  return `<li class="club ${c.partner ? 'club--partner' : ''}">
      ${c.partner ? `<span class="club__frame">${peak()}${t('map.partner')}</span>` : ''}
      <span class="club__type club__type--${c.type}">${CLUB_TYPE[c.type]}</span>
      <h4>${esc(c.name)}</h4>
      ${c.description ? `<p>${esc(c.description)}</p>` : ''}
      <dl>
        <dt>Municipi</dt><dd>${esc(c.town)}</dd>
        ${c.days && c.days !== 'Per confirmar' ? `<dt>Quan i on</dt><dd>${esc(c.days)}</dd>` : ''}
        ${c.cost && c.cost !== 'Per confirmar' ? `<dt>Cost</dt><dd>${esc(c.cost)}</dd>` : ''}
        ${c.attendance ? `<dt>Grup</dt><dd>${esc(c.attendance)}</dd>` : ''}
      </dl>
      <div class="race__actions">
        <button type="button" data-locate="${c.id}">Al mapa</button>
        ${c.source ? `<a href="${esc(c.source)}" target="_blank" rel="noopener">Més info<span class="sr-only"> sobre ${esc(c.name)} (pestanya nova)</span></a>` : ''}
      </div>
    </li>`;
}

function renderClubs() {
  const list = filteredClubs().sort((a, b) => b.partner - a.partner || a.name.localeCompare(b.name, 'ca'));
  const shown = showAllClubs ? list : list.slice(0, PAGE);
  $('#clubList').innerHTML = shown.length ? shown.map(clubCard).join('') : '<li class="empty">Cap club amb aquests filtres.</li>';
  const more = $('#clubMore');
  more.hidden = list.length <= PAGE || showAllClubs;
  more.textContent = `Veure tots els clubs (${list.length})`;
  $('#clubStatus').textContent = `${list.length} clubs`;
  if (map) drawClubs(list);
}

function fillTowns() {
  const towns = [...new Set(clubs.map(c => c.town))].sort((a, b) => a.localeCompare(b, 'ca'));
  $('#townSelect').insertAdjacentHTML('beforeend', towns.map(t => `<option>${esc(t)}</option>`).join(''));
}

function fillMonths() {
  const months = [...new Set(races.map(r => monthKey(r.date)))].sort();
  $('#monthSelect').insertAdjacentHTML('beforeend', months.map(m => {
    const label = fmtDate(m + '-01', { month: 'long', year: 'numeric' });
    return `<option value="${m}">${label[0].toUpperCase() + label.slice(1)}</option>`;
  }).join(''));
}

/* ---------- Mapa SVG ---------- */
const popClub = c => `<div class="pop">${c.partner ? `<p class="pop__badge">${peak()}${t('map.partner')}</p>` : ''}<p class="pop__k" style="margin-top:0">${CLUB_TYPE[c.type]} · ${esc(c.town)}</p><h3>${esc(c.name)}</h3>
  ${c.days && c.days !== 'Per confirmar' ? `<p>${esc(c.days)}</p>` : ''}
  ${c.cost && c.cost !== 'Per confirmar' ? `<p>${esc(c.cost)}</p>` : ''}
  ${c.approx ? '<p class="pop__k">Ubicació aproximada</p>' : ''}
  ${c.source ? `<p><a href="${esc(c.source)}" target="_blank" rel="noopener">Més info →</a></p>` : ''}</div>`;
const popRace = r => `<div class="pop">${r.challenge ? `<p class="pop__badge">${peak()}${t('map.challenge')}</p>` : ''}<p class="pop__k" style="margin-top:0">${RTYPE[r.type]} · ${countdown(r.date)}</p><h3>${esc(r.name)}</h3>
  <p>${cap(fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'long' }))} · ${esc(r.town)}</p>
  ${r.distances.length ? `<p>${r.distances.map(kmLabel).join(' · ')}</p>` : ''}
  <p><button type="button" class="pop__more" data-race="${r.id}">Veure la fitxa →</button></p></div>`;

function drawRaces(list) {
  map.clear('races');
  list.forEach(r => map.add('races', { id: r.id, lat: r.lat, lng: r.lng, html: '<span></span>', cls: `mk mk--race ${r.challenge ? 'has-challenge' : ''}`,
    label: `Carrera: ${r.name}, ${fmtDate(r.date, { day: 'numeric', month: 'long' })}`, popup: popRace(r) }));
}

function drawClubs(list) {
  map.clear('clubs');
  list.forEach(c => map.add('clubs', { id: c.id, lat: c.lat, lng: c.lng, html: peak(), cls: `mk mk--club mk--${c.type} ${c.partner ? 'is-partner' : ''}`,
    label: `Club: ${c.name}, ${c.town}`, popup: popClub(c) }));
}

async function initMap() {
  map = await new SvgMap($('#map')).load(CONFIG.map.svg);
  drawClubs(filteredClubs());
  drawRaces(filteredRaces());
  map.fit([...clubs, ...races].map(p => map.project(p.lat, p.lng)), 50);
  const toggle = (id, layer) => $(id).addEventListener('change', e => map.show(layer, e.target.checked));
  toggle('#layerClubs', 'clubs'); toggle('#layerRaces', 'races');
}

function locate(id) {
  $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const go = () => {
    const isClub = id.startsWith('c'); const box = $(isClub ? '#layerClubs' : '#layerRaces');
    if (!box.checked) { box.checked = true; box.dispatchEvent(new Event('change')); }
    map.open(id, 6);
  };
  map ? go() : mapReady.then(go);
}

let mapReady;
export async function initExplore() {
  [races, clubs] = await Promise.all([load('races'), load('clubs')]);
  races.sort((a, b) => a.date.localeCompare(b.date));
  featured(); fillMonths(); fillTowns(); renderRaces(); renderClubs();
  $('#clubFilters').addEventListener('change', () => { showAllClubs = false; renderClubs(); });
  $('#clubMore').addEventListener('click', () => { showAllClubs = true; renderClubs(); });
  const rf = $('#raceFilters');
  rf.addEventListener('change', () => { raceLimit = 12; renderRaces(); });
  let qt; rf.addEventListener('input', e => { if (e.target.name === 'q') { clearTimeout(qt); qt = setTimeout(() => { raceLimit = 12; renderRaces(); }, 150); } });
  rf.addEventListener('submit', e => e.preventDefault());
  $('#raceMore').addEventListener('click', () => { raceLimit += 24; renderRaces(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-race]'); if (b) { e.preventDefault(); openRace(b.dataset.race); }
    const s = e.target.closest('[data-share]'); if (s) share(s.dataset.share);
  });
  $('#raceModal').addEventListener('close', () => { if (location.hash.startsWith('#cursa=')) history.replaceState(null, '', location.pathname + location.search); });
  const deep = location.hash.match(/^#cursa=(.+)$/); if (deep) openRace(decodeURIComponent(deep[1]));
  document.addEventListener('click', e => { const b = e.target.closest('[data-locate]'); if (b) locate(b.dataset.locate); });

  // Càrrega diferida del mapa: només quan s'hi acosta l'usuari.
  mapReady = new Promise(res => {
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); initMap().then(res).catch(err => { console.error(err); $('#map .map__placeholder span').textContent = 'No s\'ha pogut carregar el mapa. Tens la llista a sota.'; }); } }, { rootMargin: '400px' });
    io.observe($('#map'));
  });

  // Formulari "Afegeix el teu club o carrera"
  const form = $('#submitForm');
  $('#openSubmit').addEventListener('click', () => openDialog($('#submitModal')));
  form.addEventListener('change', e => {
    if (e.target.name !== 'kind') return;
    const k = e.target.value;
    form.querySelectorAll('[data-kind]').forEach(el => { el.hidden = el.dataset.kind !== k; });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('.form-msg', form);
    if (!form.checkValidity()) { msg.textContent = 'Revisa els camps obligatoris.'; form.querySelector(':invalid')?.focus(); return; }
    const ok = await submitForm(form, CONFIG.forms.submission).catch(() => false);
    msg.textContent = ok ? t('form.thanks') : t('form.error');
    if (ok) form.reset();
  });
}
