// Banner: canvia de diapositiva cada 6 s, amb fletxes, punts, lliscament, teclat i pausa.
export function initBanner(root, { interval = 6000 } = {}) {
  if (!root) return;
  const track = root.querySelector('.banner__track');
  const slides = [...root.querySelectorAll('.banner__slide')];
  const dots = [...root.querySelectorAll('.banner__dot')];
  const pauseBtn = root.querySelector('.banner__pause');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, timer, userPaused = reduce, hover = false;
  root.style.setProperty('--dur', interval + 'ms');

  function go(n, focus) {
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(${-i * 100}%)`;
    slides.forEach((s, k) => { s.setAttribute('aria-hidden', k !== i); s.inert = k !== i; });
    dots.forEach((d, k) => { d.setAttribute('aria-selected', k === i); d.tabIndex = k === i ? 0 : -1; });
    if (focus) dots[i].focus();
    // reinicia l'animació de la barra de progrés
    root.classList.remove('is-playing'); void root.offsetWidth; schedule();
  }
  function schedule() {
    clearTimeout(timer);
    const run = !userPaused && !hover && !document.hidden;
    root.classList.toggle('is-playing', run);
    root.classList.toggle('is-paused', !run);
    if (run) timer = setTimeout(() => go(i + 1), interval);
  }
  function setPaused(p) {
    userPaused = p; pauseBtn.setAttribute('aria-pressed', p);
    pauseBtn.setAttribute('aria-label', p ? 'Reprèn el canvi automàtic' : 'Atura el canvi automàtic'); schedule();
  }

  root.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => go(i + +b.dataset.dir)));
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  root.querySelector('.banner__dots').addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { go(i + 1, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(i - 1, true); e.preventDefault(); }
  });
  pauseBtn.addEventListener('click', () => setPaused(!userPaused));
  // Pausa mentre el focus de teclat és a dins (WCAG 2.2.2); el botó permet aturar-lo sempre
  root.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) { hover = true; schedule(); } });
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) { hover = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);

  // Lliscar amb el dit
  let x0 = null, y0 = 0, dx = 0;
  track.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; dx = 0; });
  track.addEventListener('pointermove', e => {
    if (x0 === null) return; dx = e.clientX - x0;
    if (Math.abs(dx) > Math.abs(e.clientY - y0)) { track.style.transition = 'none'; track.style.transform = `translateX(calc(${-i * 100}% + ${dx}px))`; }
  });
  const end = () => {
    if (x0 === null) return; track.style.transition = '';
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); else go(i);
    x0 = null;
  };
  track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);

  // Enllaços #manifest porten a la diapositiva 2
  document.addEventListener('click', e => { const a = e.target.closest('a[href="#manifest"]'); if (a) { e.preventDefault(); root.scrollIntoView({ behavior: 'smooth' }); go(1); } });

  if (reduce) { pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.setAttribute('aria-label', 'Reprèn el canvi automàtic'); }
  go(0);
}
