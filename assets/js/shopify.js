// Adaptador Shopify Storefront API. Sense config, la botiga funciona en mode demo.
import { CONFIG } from './config.js';
const { domain, storefrontToken, apiVersion } = CONFIG.shopify;
export const enabled = Boolean(domain && storefrontToken);

async function gql(query, variables = {}) {
  const r = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontToken },
    body: JSON.stringify({ query, variables })
  });
  const j = await r.json(); if (j.errors) throw new Error(j.errors[0].message); return j.data;
}

// Crea un carret a Shopify i retorna la URL de checkout.
// Cada línia necessita el variantId: products.json → shopifyVariantIds { "M": "gid://shopify/ProductVariant/..." }
export async function checkout(lines) {
  const input = { lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.qty })) };
  const d = await gql(`mutation($input: CartInput!){ cartCreate(input:$input){ cart{ checkoutUrl } userErrors{ message } } }`, { input });
  const err = d.cartCreate.userErrors[0]; if (err) throw new Error(err.message);
  return d.cartCreate.cart.checkoutUrl;
}

// Opcional: carregar el catàleg directament de Shopify (col·lecció "running").
// Convenció de tags a Shopify: premium | 10k | mitja | marato
export async function fetchProducts(collection = 'running') {
  const d = await gql(`query($h:String!){ collection(handle:$h){ products(first:50){ nodes{
      handle title description tags productType
      priceRange{ minVariantPrice{ amount } }
      featuredImage{ url(transform:{maxWidth:800, preferredContentType:WEBP}) altText }
      variants(first:20){ nodes{ id title availableForSale } } } } } }`, { h: collection });
  return d.collection.products.nodes.map(p => ({
    id: p.handle, handle: p.handle, title: p.title, description: p.description,
    line: p.tags.includes('premium') ? 'premium' : 'accessible',
    type: p.productType.toLowerCase(),
    distances: p.tags.filter(t => ['10k', 'mitja', 'marato'].includes(t)),
    price: Number(p.priceRange.minVariantPrice.amount),
    image: p.featuredImage?.url, imageAlt: p.featuredImage?.altText,
    sizes: p.variants.nodes.map(v => v.title),
    shopifyVariantIds: Object.fromEntries(p.variants.nodes.map(v => [v.title, v.id])),
    features: []
  }));
}
