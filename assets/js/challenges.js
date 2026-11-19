// Reptes: repte actiu, Hall of Peaks i arxiu.
import { load } from './data.js';
import { t, fmtDate, loc } from './i18n.js';
import { $, esc, garment, peakFrame } from './ui.js';

const initials = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

export async function initChallenges() {
  const data = await load('challenges');
  const a = loc(data.active), hall = data.hall.map(loc), past = data.past.map(loc);
  const pct = Math.min(1, a.achieved / a.total);
  $('#activeChallenge').innerHTML = `
    <div class="challenge__visual">${peakFrame()}${garment(a.garment, a.color === '#6D1730' ? '#F4EFEA' : a.color, a.piece)}</div>
    <div>
      <p class="challenge__kicker">${t('ch.active')} ${fmtDate(a.endsAt, { day: 'numeric', month: 'long' })}</p>
      <h3 id="challenge-title">${esc(a.title)}</h3>
      <p class="challenge__piece">${esc(a.piece)}</p>
      <p class="challenge__desc">${esc(a.description)}</p>
      <div class="counter">
        <div class="counter__nums"><span class="counter__now">${a.achieved}</span><span class="counter__tot">/ ${a.total}</span>
          <span class="counter__label">${t('ch.achieved')}<br>${t('ch.left', { n: a.total - a.achieved })}</span></div>
        <div class="counter__bar" role="progressbar" aria-label="${t('ch.achievedA')}" aria-valuemin="0" aria-valuemax="${a.total}" aria-valuenow="${a.achieved}" aria-valuetext="${t('ch.of', { a: a.achieved, b: a.total })}">
          <span class="counter__fill" style="transform:scaleX(0)" data-pct="${pct}"></span></div>
      </div>
      <details open><summary>${t('ch.conditions')}</summary><ul>${a.conditions.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>
      <details><summary>${t('ch.verify')}</summary><p>${esc(a.verification)}</p></details>
      <a class="btn" href="https://www.strava.com/" target="_blank" rel="noopener">${t('ch.accept')}<span class="sr-only"> (${t('ch.acceptSr')})</span></a>
      <p class="strava">${t('ch.strava')}</p>
    </div>`;
  const fill = $('.counter__fill');
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { fill.style.transform = `scaleX(${fill.dataset.pct})`; o.disconnect(); } }, { threshold: .4 }).observe(fill);

  $('#hallOfPeaks').innerHTML = hall.map(h => `
    <li class="peak-card">
      <div class="peak-card__frame">${peakFrame()}<span class="peak-card__initials" aria-hidden="true">${initials(h.name)}</span></div>
      <span class="peak-card__num">Nº ${String(h.number).padStart(3, '0')} / ${a.total}</span>
      <h4>${esc(h.name)}</h4>
      <p>${esc(h.town)} · ${esc(h.note)}</p>
    </li>`).join('');

  $('#pastChallenges').innerHTML = past.map(p => `
    <li class="past">
      <div class="past__media">${garment(p.garment, p.color === '#1A1A1A' ? '#F4EFEA' : p.color)}</div>
      <div><h4>${esc(p.title)}</h4><p>${esc(p.piece)}</p><p>${esc(p.rule)} · ${esc(p.period)}</p><span class="past__closed">${t('ch.closed')} · ${p.units}/${p.units}</span></div>
    </li>`).join('');
}
