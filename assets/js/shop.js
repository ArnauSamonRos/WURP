// Botiga: graella, filtres, fitxa de producte i cistella.
import { load } from './data.js';
import { t, money } from './i18n.js';
import { $, $$, esc, garment, openDialog, toast } from './ui.js';
import * as shopify from './shopify.js';

const KEY = 'wurp.cart';
let products = [];
let cart = [];
try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch { cart = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} renderCart(); };

const media = (p, label) => p.image
  ? `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || label)}" loading="lazy" width="800" height="1000">`
  : garment(p.garment, p.color, label);

function card(p) {
  const alt = `${p.title}, color ${p.colorName ?? ''}`.trim();
  return `<li class="product reveal">
    <button class="product__btn" data-product="${esc(p.id)}" aria-label="${esc(p.title)}, ${money(p.price)}. ${t('shop.view')}">
      <div class="product__media">
        <span class="product__tag ${p.line === 'premium' ? 'product__tag--premium' : ''}">${t('line.' + p.line)}</span>
        ${media(p, alt)}
      </div>
      <div class="product__info">
        <span class="product__title">${esc(p.title)}</span>
        <span class="product__meta">${p.distances.map(d => t('dist.' + d)).join(' · ')}</span>
        <span class="product__price">${money(p.price)}</span>
      </div>
    </button>
  </li>`;
}

function renderGrid() {
  const f = Object.fromEntries(new FormData($('#shopFilters')));
  const list = products.filter(p => (!f.line || p.line === f.line) && (!f.type || p.type === f.type) && (!f.distance || p.distances.includes(f.distance)));
  $('#productGrid').innerHTML = list.length ? list.map(card).join('') : `<li class="empty">${t('shop.empty')}</li>`;
  $('#shopStatus').textContent = `${list.length} peces`;
  requestAnimationFrame(() => $$('#productGrid .reveal').forEach(el => el.classList.add('is-in')));
}

function openProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const body = $('#productModalBody');
  body.innerHTML = `
    <button class="modal__close" data-close aria-label="Tanca la fitxa">×</button>
    <div class="pdp">
      <div class="pdp__media">${media(p, `${p.title}, color ${p.colorName ?? ''}`)}</div>
      <div>
        <p class="pdp__line">Línia ${t('line.' + p.line)}</p>
        <h2 id="pm-title">${esc(p.title)}</h2>
        <p class="pdp__price">${money(p.price)}</p>
        <p class="pdp__desc">${esc(p.description)}</p>
        <ul class="pdp__features">${(p.features || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="reco"><span class="reco__label">${t('shop.recommended')}:</span>
          ${['10k', 'mitja', 'marato'].map(d => `<span class="reco__item ${p.distances.includes(d) ? 'is-on' : ''}">${p.distances.includes(d) ? '' : '<span class="sr-only">No recomanat: </span>'}${t('dist.' + d)}</span>`).join('')}
        </div>
        <form id="addForm" novalidate>
          <div class="pdp__row">
            <span class="reco__label">Talla</span>
            <button type="button" data-open-size-guide>${t('shop.sizeGuide')}</button>
          </div>
          <fieldset class="chips sizes"><legend class="sr-only">Talla</legend>
            ${p.sizes.map(s => `<label><input type="radio" name="size" value="${esc(s)}" ${p.sizes.length === 1 ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('')}
          </fieldset>
          <p class="pdp__error" role="alert"></p>
          <button class="btn btn--block" type="submit">${t('shop.add')} · ${money(p.price)}</button>
        </form>
      </div>
    </div>`;
  $('#addForm', body).addEventListener('submit', e => {
    e.preventDefault();
    const size = new FormData(e.target).get('size');
    if (!size) { $('.pdp__error', body).textContent = t('shop.selectSize'); $('input[name=size]', body).focus(); return; }
    add(p, size);
    $('#productModal').close();
    toast(`${t('cart.added')}: ${p.title} (${size})`);
  });
  openDialog($('#productModal'));
}

function add(p, size) {
  const line = cart.find(l => l.id === p.id && l.size === size);
  if (line) line.qty++; else cart.push({ id: p.id, size, qty: 1 });
  save();
}

function renderCart() {
  const items = cart.map(l => ({ ...l, p: products.find(x => x.id === l.id) })).filter(l => l.p);
  const count = items.reduce((n, l) => n + l.qty, 0);
  const total = items.reduce((n, l) => n + l.qty * l.p.price, 0);
  const c = $('#cartCount'); c.textContent = count; c.toggleAttribute('data-empty', !count);
  $('#cartOpen').setAttribute('aria-label', `Obre la cistella, ${count} articles`);
  $('#cartTotal').textContent = money(total);
  $('#checkoutBtn').disabled = !count;
  $('#cartNote').textContent = shopify.enabled ? '' : t('cart.demo');
  $('#cartItems').innerHTML = items.length ? items.map((l, i) => `
    <li class="cart-item">
      <div class="cart-item__media">${garment(l.p.garment, l.p.color)}</div>
      <div>
        <p class="cart-item__title">${esc(l.p.title)}</p>
        <p class="cart-item__meta">Talla ${esc(l.size)} · ${money(l.p.price)}</p>
        <div class="qty" role="group" aria-label="Quantitat de ${esc(l.p.title)}">
          <button data-qty="-1" data-i="${i}" aria-label="Una menys">−</button><span aria-live="polite">${l.qty}</span><button data-qty="1" data-i="${i}" aria-label="Una més">+</button>
        </div>
      </div>
      <button class="cart-item__remove" data-remove="${i}">${t('cart.remove')}<span class="sr-only"> ${esc(l.p.title)}</span></button>
    </li>`).join('') : `<li class="cart-empty">${t('cart.empty')}</li>`;
}

export async function initShop() {
  products = await load('products');
  if (shopify.enabled) { try { products = await shopify.fetchProducts(); } catch (e) { console.warn('Shopify no disponible, faig servir JSON', e); } }
  renderGrid(); renderCart();

  $('#shopFilters').addEventListener('change', renderGrid);
  $$('[data-filter-line]').forEach(b => b.addEventListener('click', () => {
    $(`#shopFilters input[name=line][value="${b.dataset.filterLine}"]`).checked = true; renderGrid();
    $('#shopFilters').scrollIntoView({ block: 'start' });
  }));
  $('#productGrid').addEventListener('click', e => { const b = e.target.closest('[data-product]'); if (b) openProduct(b.dataset.product); });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-size-guide]')) { e.preventDefault(); openDialog($('#sizeGuide')); }
  });
  $('#cartOpen').addEventListener('click', () => openDialog($('#cartDrawer')));
  $('#cartItems').addEventListener('click', e => {
    const q = e.target.closest('[data-qty]'), r = e.target.closest('[data-remove]');
    if (q) { const l = cart[q.dataset.i]; l.qty += +q.dataset.qty; if (l.qty < 1) cart.splice(q.dataset.i, 1); save(); }
    if (r) { cart.splice(r.dataset.remove, 1); save(); $('#cartDrawer .modal__close').focus(); }
  });
  $('#checkoutBtn').addEventListener('click', async () => {
    if (!shopify.enabled) { toast(t('cart.demo')); return; }
    try {
      const lines = cart.map(l => ({ variantId: products.find(p => p.id === l.id)?.shopifyVariantIds?.[l.size], qty: l.qty }));
      if (lines.some(l => !l.variantId)) throw new Error('Falta variantId de Shopify');
      location.href = await shopify.checkout(lines);
    } catch (e) { console.error(e); toast(t('form.error')); }
  });
}
