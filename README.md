# WURP — What's ur peak?

Web estàtica (HTML + CSS + JS mòduls, sense build). Botiga, mapa de carreres i clubs, i reptes.

## Executar en local
```bash
python3 -m http.server 8080
```
Obre http://localhost:8080 (cal un servidor: les dades es carreguen amb `fetch`).

## Estructura
```
index.html              Estructura i textos fixos (català)
assets/css/styles.css   Disseny (tokens de color i tipografia a :root)
assets/js/config.js     ← Configuració: fonts de dades, Shopify, formularis, mapa
assets/js/data.js       Carrega JSON o Google Sheets (CSV)
assets/js/shop.js       Graella, filtres, fitxa, cistella
assets/js/shopify.js    Adaptador Storefront API (cartCreate → checkout)
assets/js/explore.js    Carrera del mes, mapa Leaflet (càrrega diferida), llistes, formulari
assets/js/challenges.js Repte actiu, Hall of Peaks, arxiu
assets/js/i18n.js       Textos de la UI generada per JS
data/*.json             ← Contingut editable (productes, clubs, carreres, reptes, Instagram)
i18n/ca.json, es.json   Cadenes de traducció
assets/img/             Logo i il·lustracions provisionals
```

## Editar contingut
- **Carreres / clubs**: edita `data/races.json` i `data/clubs.json`. `featured: true` marca la Carrera WURP del mes (amb `meetup`); `challenge: true` mostra la icona de repte; `partner: true` destaca el club amb el marc del logo.
- **Google Sheets**: crea un full amb les mateixes columnes (per a la quedada: `meetup.place`, `meetup.time`, `meetup.note`), publica'l com a CSV i posa la URL a `config.js → data.races.sheetCsv`. Si falla, es fa servir el JSON.
- **Repte actiu**: `data/challenges.json` → `active.achieved` actualitza el comptador.

## Shopify
1. Crea un token de Storefront API i posa `domain` i `storefrontToken` a `config.js`.
2. Amb això, el catàleg es llegeix de la col·lecció `running` (tags: `premium`, `10k`, `mitja`, `marato`) i el botó de pagament crea un carret i redirigeix al checkout de Shopify.
3. Sense configuració, la botiga funciona en mode demo amb `data/products.json` i cistella local.

## Formularis
`config.js → forms.submission` i `forms.newsletter`: qualsevol endpoint que accepti POST JSON (Formspree, Make, Klaviyo via proxy…). Buits = mode demo.

## Castellà
Afegeix `'es'` a `CONFIG.languages`, completa `i18n/es.json` i marca els textos del HTML amb `data-i18n="clau"`. S'activa amb `?lang=es`.

## Pendent abans de publicar
- Substituir `assets/img/hero.svg`, `about.svg` i les il·lustracions de producte per fotos reals (WebP, 800/1600 px).
- Connectar el feed d'Instagram (Behold, Elfsight o Graph API) a `data/instagram.json` o al component.
- Integrar Strava OAuth per a la verificació dels reptes (requereix backend).
- Textos legals reals (avís legal, privacitat, cookies).
