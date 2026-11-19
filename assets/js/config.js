// Configuració central. Edita aquí, no al codi dels components.
export const CONFIG = {
  defaultLang: 'ca',
  languages: ['ca'],            // afegeix 'es' quan la traducció estigui completa
  // Fonts de dades: fitxer JSON local o URL CSV publicada de Google Sheets
  // (Fitxer > Compartir > Publicar al web > CSV). Si poses una URL CSV, té prioritat.
  data: {
    products:   { json: 'data/products.json' },
    clubs:      { json: 'data/clubs.json',  sheetCsv: '' },
    races:      { json: 'data/races.json',  sheetCsv: '' },
    challenges: { json: 'data/challenges.json' },
    instagram:  { json: 'data/instagram.json' }
  },
  // Shopify Storefront API. Deixa-ho buit per al mode demo (cistella local).
  shopify: {
    domain: '',                 // p. ex. 'wurp.myshopify.com'
    storefrontToken: '',        // token públic de Storefront API
    apiVersion: '2025-01'
  },
  // Endpoints de formularis (Formspree, Netlify Forms, Make, etc.)
  forms: {
    submission: '',             // "Afegeix el teu club o carrera"
    newsletter: ''              // Klaviyo / Mailchimp / Shopify Customer
  },
  map: {
    svg: 'assets/img/catalunya.svg'   // generat amb scripts/gen_map.py
  }
};
