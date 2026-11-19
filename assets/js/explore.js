// Carreres i clubs: carrera del mes, mapa SVG de Catalunya (càrrega diferida), llistes i formulari.
import { load } from './data.js';
import { CONFIG } from './config.js';
import { t, fmtDate } from './i18n.js';
import { $, esc, peak, openDialog, submitForm } from './ui.js';
import { SvgMap } from './svgmap.js';

let races = [], clubs = [], map;

const dcat = km => km <= 5 ? '5k' : km <= 10 ? '10k' : km <= 21.1 ? 'half' : 'marathon';
const monthKey = iso => iso.slice(0, 7);
const km = n => `${String(n).replace('.', ',')} km`;
const badge = () => `<span class="challenge-badge">${peak()}Repte</span>`;

function featured() {
  const r = races.find(x => x.featured) || races[0]; if (!r) return;
  $('#featuredRace').innerHTML = `
    <div class="featured-race__label">${peak()}<p id="featured-title">Carrera WURP<br>del mes</p></div>
    <div class="featured-race__body">
      <div>
        <p class="eyebrow" style="margin-bottom:10px">${fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${esc(r.town)}</p>
        <h3>${esc(r.name)}</h3>
      </div>
      <dl class="stats">
        <div class="stat"><dt>Distància</dt><dd>${km(r.distanceKm)}</dd></div>
        <div class="stat"><dt>Ritme</dt><dd>${esc(r.pace)}</dd></div>
        <div class="stat"><dt>Tipus</dt><dd>${t('rtype.' + r.type)}</dd></div>
      </dl>
      ${r.meetup ? `<div class="meetup"><strong>Quedada WURP · ${esc(r.meetup.time)} · ${esc(r.meetup.place)}</strong><p>${esc(r.meetup.note || '')}</p></div>` : ''}
      <div class="featured-race__ctas">
        <a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Inscriu-te<span class="sr-only"> (s'obre en una pestanya nova)</span></a>
        ${r.challenge ? `<a class="btn btn--outline" href="#reptes">Té repte associat</a>` : ''}
      </div>
    </div>`;
}

function filteredRaces() {
  const f = Object.fromEntries(new FormData($('#raceFilters')));
  return races.filter(r => (!f.month || monthKey(r.date) === f.month) && (!f.dcat || dcat(r.distanceKm) === f.dcat) && (!f.rtype || r.type === f.rtype));
}

function renderRaces() {
  const list = filteredRaces();
  $('#raceList').innerHTML = list.length ? list.map(r => `
    <li class="race">
      <div class="race__date" aria-hidden="true"><span class="race__day">${fmtDate(r.date, { day: 'numeric' })}</span><span class="race__mon">${fmtDate(r.date, { month: 'short' }).replace('.', '')}</span></div>
      <div>
        <h4 class="race__name"><span class="sr-only">${fmtDate(r.date, { day: 'numeric', month: 'long', year: 'numeric' })}: </span>${esc(r.name)} ${r.challenge ? badge() : ''}</h4>
        <p class="race__meta">${esc(r.town)}</p>
      </div>
      <p class="race__meta">${km(r.distanceKm)} · ${t('rtype.' + r.type)} · ${esc(r.pace)}</p>
      <div class="race__actions">
        <button type="button" data-locate="${r.id}">Al mapa</button>
        <a href="${esc(r.url)}" target="_blank" rel="noopener">${t('map.signup')}<span class="sr-only"> a ${esc(r.name)} (pestanya nova)</span></a>
      </div>
    </li>`).join('') : `<li class="empty">${t('race.empty')}</li>`;
  $('#raceStatus').textContent = `${list.length} carreres`;
  if (map) drawRaces(list);
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
const popRace = r => `<div class="pop">${r.challenge ? `<p class="pop__badge">${peak()}${t('map.challenge')}</p>` : ''}<h3>${esc(r.name)}</h3>
  <p>${fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'long' })} · ${esc(r.town)}</p>
  <p>${km(r.distanceKm)} · ${t('rtype.' + r.type)} · ${esc(r.pace)}</p>
  <p><a href="${esc(r.url)}" target="_blank" rel="noopener">${t('map.signup')} →</a></p></div>`;

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
  $('#raceFilters').addEventListener('change', renderRaces);
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
