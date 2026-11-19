import { initI18n, t } from './i18n.js';
import { CONFIG } from './config.js';
import { load } from './data.js';
import { $, esc, wireDialogs, submitForm } from './ui.js';
import { initShop } from './shop.js';
import { initExplore } from './explore.js';
import { initChallenges } from './challenges.js';
import { initBanner } from './banner.js';

// Tons càlids per al feed (placeholder fins connectar Instagram: Behold, Elfsight o Graph API).
const TONES = ['#6D1730,#C9876B', '#3A2A2E,#B9775C', '#8A2A45,#E2B48E', '#D9C4B0,#F4EFEA', '#561226,#9A5A48', '#2A1B1F,#7A3B3F'];
async function initCommunity() {
  const posts = await load('instagram');
  $('#instaFeed').innerHTML = posts.map(p => {
    const [a, b] = TONES[(p.tone - 1) % TONES.length].split(',');
    return `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">
      <svg class="insta__img" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(p.alt)}">
        <defs><linearGradient id="g${p.tone}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs>
        <rect width="100" height="100" fill="url(#g${p.tone})"/>
        <path d="M0 100 V70 H12 V58 H22 V66 H30 V48 H40 V62 H52 V54 H60 V40 H70 V60 H80 V52 H90 V64 H100 V100 Z" fill="${a}" opacity=".75"/>
        <path transform="translate(44 18) scale(.16)" d="M37 0 L74 55.5 L54.8 86 L37 59 L19.2 86 L0 55.5 Z" fill="none" stroke="#F4EFEA" stroke-width="5" opacity=".8"/>
      </svg>
      <span class="insta__cap">${esc(p.caption)}</span></a></li>`;
  }).join('');

  const form = $('#newsletterForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('.form-msg', form), input = $('#nlEmail');
    if (!input.checkValidity()) { msg.textContent = 'Escriu un correu vàlid.'; input.focus(); return; }
    const ok = await submitForm(form, CONFIG.forms.newsletter).catch(() => false);
    msg.textContent = ok ? t('form.news') : t('form.error');
    if (ok) form.reset();
  });
}

function initNav() {
  const btn = $('#menuBtn'), nav = $('#nav');
  const set = open => { btn.setAttribute('aria-expanded', open); nav.classList.toggle('is-open', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); } });
}

function initReveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.section__head, .ascent__step, .line-card, .steps li').forEach(el => { el.classList.add('reveal'); io.observe(el); });
}

(async () => {
  $('#year').textContent = new Date().getFullYear();
  initNav(); wireDialogs(); initBanner($('#banner')); initReveal();
  await initI18n();
  const results = await Promise.allSettled([initShop(), initExplore(), initChallenges(), initCommunity()]);
  results.forEach(r => r.status === 'rejected' && console.error(r.reason));
})();
