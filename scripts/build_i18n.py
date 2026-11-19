"""Genera les versions /es/ i /en/ a partir d'index.html (font en català) i el SEO de totes tres.

Ús:  python3 scripts/build_i18n.py
Torna'l a executar cada cop que canviïs index.html, i18n/html.json o data/races.json.

- Tradueix textos i atributs (alt, aria-label, placeholder, title) amb i18n/html.json.
- Escriu el bloc SEO (title, description, canonical, hreflang, Open Graph, Twitter, JSON-LD)
  entre <!-- SEO:START --> i <!-- SEO:END --> de cada pàgina.
- Afegeix les properes curses com a SportsEvent (dades estructurades).
- Genera sitemap.xml i robots.txt.
"""
import datetime, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SITE = re.search(r"site:\s*'([^']+)'", open('assets/js/config.js').read()).group(1).rstrip('/') + '/'

LANGS = {
    'ca': {'path': '', 'og': 'ca_ES', 'label': 'CA', 'name': 'Català',
           'title': "WURP — What's ur peak? Roba de running i clubs socials a Catalunya",
           'desc': "Roba de running, clubs socials i el calendari de curses de Catalunya. Reptes per aconseguir peces exclusives. Tria el teu objectiu i treballa'l amb constància."},
    'es': {'path': 'es/', 'og': 'es_ES', 'label': 'ES', 'name': 'Español',
           'title': "WURP — What's ur peak? Ropa de running y clubs sociales en Cataluña",
           'desc': "Ropa de running, clubs sociales y el calendario de carreras de Cataluña. Retos para conseguir prendas exclusivas. Elige tu objetivo y trabájalo con constancia."},
    'en': {'path': 'en/', 'og': 'en_GB', 'label': 'EN', 'name': 'English',
           'title': "WURP — What's ur peak? Running apparel & social run clubs in Catalonia",
           'desc': "Running apparel, social run clubs and the race calendar for Catalonia. Challenges to earn exclusive pieces. Pick your goal and work on it consistently."},
}
OG_IMAGE = SITE + 'assets/img/hero-1951.webp'
TRANS = json.load(open('i18n/html.json'))
RACES = json.load(open('data/races.json'))
TODAY = datetime.date.today().isoformat()


def seo_block(lang):
    L = LANGS[lang]
    url = SITE + L['path']
    alt = '\n'.join(f'<link rel="alternate" hreflang="{k}" href="{SITE + v["path"]}">' for k, v in LANGS.items())
    og_alt = '\n'.join(f'<meta property="og:locale:alternate" content="{v["og"]}">' for k, v in LANGS.items() if k != lang)
    upcoming = [r for r in RACES if (r.get('endDate') or r['date']) >= TODAY][:40]
    events = [{
        '@type': 'SportsEvent', 'name': r['name'], 'sport': 'Running',
        'startDate': r['date'], 'endDate': r.get('endDate') or r['date'],
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
        'location': {'@type': 'Place', 'name': r['town'],
                     'address': {'@type': 'PostalAddress', 'addressLocality': r['town'], 'addressRegion': 'Catalunya', 'addressCountry': 'ES'},
                     'geo': {'@type': 'GeoCoordinates', 'latitude': r['lat'], 'longitude': r['lng']}},
        'url': r['url'],
        **({'description': ' · '.join(f"{str(k).rstrip('0').rstrip('.')} km" for k in r['distances'])} if r['distances'] else {}),
    } for r in upcoming]
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Organization', '@id': SITE + '#org', 'name': 'WURP', 'alternateName': "What's ur peak?", 'url': SITE,
         'logo': SITE + 'assets/img/logo.svg', 'email': 'hola@wurp.run', 'sameAs': ['https://instagram.com/wurp.run']},
        {'@type': 'WebSite', '@id': SITE + '#web', 'url': url, 'name': 'WURP', 'inLanguage': lang, 'publisher': {'@id': SITE + '#org'}},
        {'@type': 'ItemList', 'name': {'ca': 'Calendari de curses a Catalunya', 'es': 'Calendario de carreras en Cataluña', 'en': 'Race calendar in Catalonia'}[lang],
         'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'item': e} for i, e in enumerate(events)]},
    ]}
    e = html.escape
    return f'''<!-- SEO:START (generat per scripts/build_i18n.py) -->
<title>{e(L["title"])}</title>
<meta name="description" content="{e(L["desc"])}">
<link rel="canonical" href="{url}">
{alt}
<link rel="alternate" hreflang="x-default" href="{SITE}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WURP">
<meta property="og:title" content="{e(L["title"])}">
<meta property="og:description" content="{e(L["desc"])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1951">
<meta property="og:image:height" content="806">
<meta property="og:locale" content="{L["og"]}">
{og_alt}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(L["title"])}">
<meta name="twitter:description" content="{e(L["desc"])}">
<meta name="twitter:image" content="{OG_IMAGE}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')}</script>
<!-- SEO:END -->'''


def langs_nav(lang):
    up = '../' if LANGS[lang]['path'] else ''
    links = []
    for k, v in LANGS.items():
        href = (up + v['path']) or './'
        cur = ' aria-current="page"' if k == lang else ''
        links.append(f'<a href="{href}" hreflang="{k}" lang="{k}" title="{v["name"]}"{cur}>{v["label"]}</a>')
    return ''.join(links)


def translate(src, lang):
    out, missing = src, []
    for ca in sorted(TRANS, key=len, reverse=True):
        tr = TRANS[ca][lang]
        n0 = out
        out = re.sub(r'(>\s*)' + re.escape(ca) + r'(\s*<)', lambda m: m.group(1) + tr + m.group(2), out)
        out = re.sub(r'((?:alt|aria-label|placeholder|title|content)=")' + re.escape(ca) + '"', lambda m: m.group(1) + tr.replace('"', '&quot;') + '"', out)
        if out == n0: missing.append(ca)
    return out, missing


def build(src, lang):
    page = re.sub(r'<!-- SEO:START.*?<!-- SEO:END -->', lambda m: seo_block(lang), src, flags=re.S)
    page = re.sub(r'(<nav class="langs[^"]*" aria-label="[^"]*">).*?(</nav>)', lambda m: m.group(1) + '<!-- LANGS -->' + m.group(2), page)
    page = page.replace('<!-- LANGS -->', langs_nav(lang))
    if lang == 'ca':
        return page, []
    page, missing = translate(page, lang)
    page = page.replace('<html lang="ca">', f'<html lang="{lang}">')
    page = re.sub(r'((?:href|src)=")(assets/)', r'\1../\2', page)
    return page, missing


src = open('index.html').read()
for lang, L in LANGS.items():
    page, missing = build(src, lang)
    path = L['path'] + 'index.html'
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w').write(page)
    print(f'{path}: ok' + (f' — sense coincidència ({len(missing)}): {missing}' if missing else ''))

# sitemap.xml amb alternates per idioma
alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{k}" href="{SITE + v["path"]}"/>' for k, v in LANGS.items())
urls = ''.join(f'''
  <url>
    <loc>{SITE + v["path"]}</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{"1.0" if not v["path"] else "0.9"}</priority>{alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE}"/>
  </url>''' for v in LANGS.values())
open('sitemap.xml', 'w').write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">{urls}\n</urlset>\n')
open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n')
print('sitemap.xml, robots.txt: ok')
