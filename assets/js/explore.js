// Carreres i clubs: carrera del mes, mapa (Leaflet, càrrega diferida), llistes i formulari.
import { load } from './data.js';
import { CONFIG } from './config.js';
import { t, fmtDate } from './i18n.js';
import { $, esc, peak, openDialog, submitForm } from './ui.js';

let races = [], clubs = [], map, layers = {};

const dcat = km => km <= 10 ? 'short' : km <= 21.1 ? 'half' : km <= 42.2 ? 'marathon' : 'ultra';
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
        <div class="stat"><dt>Desnivell</dt><dd>${r.elevation} m</dd></div>
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
      <p class="race__meta">${km(r.distanceKm)} · ${t('race.elev')} ${r.elevation} m · ${t('rtype.' + r.type)}</p>
      <div class="race__actions">
        <button type="button" data-locate="${r.id}">Al mapa</button>
        <a href="${esc(r.url)}" target="_blank" rel="noopener">${t('map.signup')}<span class="sr-only"> a ${esc(r.name)} (pestanya nova)</span></a>
      </div>
    </li>`).join('') : `<li class="empty">${t('race.empty')}</li>`;
  $('#raceStatus').textContent = `${list.length} carreres`;
  if (map) drawRaces(list);
}

function renderClubs() {
  const sorted = [...clubs].sort((a, b) => b.partner - a.partner);
  $('#clubList').innerHTML = sorted.map(c => `
    <li class="club ${c.partner ? 'club--partner' : ''}">
      ${c.partner ? `<span class="club__frame">${peak()}${t('map.partner')}</span>` : ''}
      <h4>${esc(c.name)}</h4>
      <p>${esc(c.description || '')}</p>
      <dl>
        <dt>Zona</dt><dd>${esc(c.zone)}</dd>
        <dt>Entrenaments</dt><dd>${esc(c.days)}</dd>
        <dt>Contacte</dt><dd><a href="mailto:${esc(c.contact)}">${esc(c.contact)}</a>${c.instagram ? ` · <a href="https://instagram.com/${esc(c.instagram)}" rel="noopener">@${esc(c.instagram)}</a>` : ''}</dd>
      </dl>
      <div class="race__actions"><button type="button" data-locate="${c.id}">Al mapa</button></div>
    </li>`).join('');
}

function fillMonths() {
  const months = [...new Set(races.map(r => monthKey(r.date)))].sort();
  $('#monthSelect').insertAdjacentHTML('beforeend', months.map(m => {
    const label = fmtDate(m + '-01', { month: 'long', year: 'numeric' });
    return `<option value="${m}">${label[0].toUpperCase() + label.slice(1)}</option>`;
  }).join(''));
}

/* ---------- Mapa ---------- */
function loadLeaflet() {
  return new Promise((res, rej) => {
    if (window.L) return res(window.L);
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.append(css);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => res(window.L); s.onerror = rej; document.head.append(s);
  });
}

const popClub = c => `<div class="pop">${c.partner ? `<p class="pop__badge">${peak()}${t('map.partner')}</p>` : ''}<h3>${esc(c.name)}</h3>
  <p class="pop__k">Zona</p><p>${esc(c.zone)}</p><p class="pop__k">Entrenaments</p><p>${esc(c.days)}</p>
  <p><a href="mailto:${esc(c.contact)}">${esc(c.contact)}</a></p></div>`;
const popRace = r => `<div class="pop">${r.challenge ? `<p class="pop__badge">${peak()}${t('map.challenge')}</p>` : ''}<h3>${esc(r.name)}</h3>
  <p>${fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'long' })} · ${esc(r.town)}</p>
  <p>${km(r.distanceKm)} · ${t('race.elev')} ${r.elevation} m · ${t('rtype.' + r.type)}</p>
  <p><a href="${esc(r.url)}" target="_blank" rel="noopener">${t('map.signup')} →</a></p></div>`;

const markers = {};
function drawRaces(list) {
  layers.races.clearLayers();
  list.forEach(r => {
    const icon = L.divIcon({ className: `mk mk--race ${r.challenge ? 'has-challenge' : ''}`, html: '<span></span>', iconSize: [24, 24] });
    markers[r.id] = L.marker([r.lat, r.lng], { icon, title: r.name, keyboard: true }).bindPopup(popRace(r)).addTo(layers.races);
  });
}

async function initMap() {
  const el = $('#map');
  const L = await loadLeaflet();
  el.innerHTML = '';
  const touch = matchMedia('(pointer:coarse)').matches;
  map = L.map(el, { scrollWheelZoom: false, dragging: !touch, tap: true, zoomControl: true }).setView(CONFIG.map.center, CONFIG.map.zoom);
  L.tileLayer(CONFIG.map.tiles, { attribution: CONFIG.map.attribution, maxZoom: 18, detectRetina: true }).addTo(map);
  // En mòbil: un toc activa el mapa perquè l'scroll de la pàgina no quedi atrapat.
  if (touch) {
    const hint = document.createElement('button');
    hint.className = 'map__hint'; hint.type = 'button'; hint.textContent = t('map.activate');
    hint.addEventListener('click', () => { map.dragging.enable(); hint.remove(); });
    el.append(hint);
  }
  map.on('focus', () => map.scrollWheelZoom.enable());
  layers.clubs = L.layerGroup().addTo(map);
  layers.races = L.layerGroup().addTo(map);
  clubs.forEach(c => {
    const icon = L.divIcon({ className: `mk mk--club ${c.partner ? 'is-partner' : ''}`, html: peak(), iconSize: c.partner ? [34, 40] : [26, 31], iconAnchor: c.partner ? [17, 40] : [13, 31] });
    markers[c.id] = L.marker([c.lat, c.lng], { icon, title: c.name, keyboard: true, zIndexOffset: c.partner ? 500 : 0 }).bindPopup(popClub(c)).addTo(layers.clubs);
  });
  drawRaces(filteredRaces());
  const toggle = (id, layer) => $(id).addEventListener('change', e => e.target.checked ? map.addLayer(layers[layer]) : map.removeLayer(layers[layer]));
  toggle('#layerClubs', 'clubs'); toggle('#layerRaces', 'races');
}

function locate(id) {
  $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const go = () => {
    const m = markers[id]; if (!m) return;
    const isClub = id.startsWith('c'); const box = $(isClub ? '#layerClubs' : '#layerRaces');
    if (!box.checked) { box.checked = true; box.dispatchEvent(new Event('change')); }
    map.flyTo(m.getLatLng(), 13, { duration: .6 }); setTimeout(() => m.openPopup(), 650);
  };
  map ? go() : mapReady.then(go);
}

let mapReady;
export async function initExplore() {
  [races, clubs] = await Promise.all([load('races'), load('clubs')]);
  races.sort((a, b) => a.date.localeCompare(b.date));
  featured(); fillMonths(); renderRaces(); renderClubs();
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
