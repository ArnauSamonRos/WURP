"""Genera data/races.json a partir de l'Excel de curses.
Ús: python3 scripts/build_races.py curses.xlsx centroides.json
centroides.json: {nom_normalitzat: [lat, lng, nom]} (municipis de Catalunya).
"""
import json, re, sys, unicodedata, openpyxl

xlsx, cent_path = sys.argv[1], sys.argv[2]
cent = json.load(open(cent_path))

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    m = re.match(r"^(.*), (el|la|els|les|l')$", s)
    if m: s = m.group(2) + ' ' + m.group(1)
    return re.sub(r"[^a-z]", "", s)

# Nuclis, barris i variants que no són noms oficials de municipi
MANUAL = {
    'Barcelona (Font de la Guatlla)': (41.3700, 2.1460), 'Barcelona (Mercabarna)': (41.3390, 2.1270),
    'Barruera': (42.5010, 0.8010), 'Castelldefels (Canal Olímpic)': (41.2810, 1.9950), 'Cellers': (42.0620, 0.9900),
    'El Vendrell (Coma-ruga)': (41.1850, 1.5230), 'Els Hostalets de Balenyà': (41.8160, 2.2390),
    'Empuriabrava': (42.2470, 3.1200), 'Espiells': (41.4430, 1.7790), "Girona – Platja d'Aro": (41.8170, 3.0670),
    'Hospitalet del Infante': (40.9930, 0.9230), "L'Ametlla de Mar (Cala Romana)": (40.8700, 0.7900),
    "L'Estartit": (42.0530, 3.1980), 'La Bleda': (41.4180, 1.6980), "Platja d'Aro": (41.8170, 3.0670),
    'Poblenou del Delta': (40.6500, 0.7480), 'Ribera de Cardós': (42.5600, 1.2240), 'Salardú': (42.7080, 0.9000),
    'Sant Vincenç de Camós': (42.0880, 2.7630), 'Santa Coloma de Gramanet': (41.4515, 2.2087),
    'Vielha': (42.7023, 0.7964), 'Vilamur': (42.3730, 1.1740),
}
TOWN_FIX = {'Santa Coloma de Gramanet': 'Santa Coloma de Gramenet', 'Hospitalet del Infante': "L'Hospitalet de l'Infant",
            'Sant Vincenç de Camós': 'Sant Vicenç de Camós', "Girona – Platja d'Aro": "Platja d'Aro"}
TYPE = {'Asfalt / ruta': 'asfalt', 'Trail / muntanya': 'trail', 'Cros': 'cros', 'Multiesport / obstacles': 'multi'}
FEATURED = 'B100 Cursa dels Nassos'
CHALLENGE = ('B100 Cursa dels Nassos', 'Mitja Marató Barcelona', 'Marató de Barcelona', 'Zurich Marató')

def km_list(s):
    if not s: return []
    out = []
    for part in re.split(r',\s+|;\s*', str(s)):
        part = part.strip()
        m = re.match(r'([\d.,]+)\s*(km|m)\b', part)
        if not m: continue
        v = float(m.group(1).replace(',', '.')); out.append(v / 1000 if m.group(2) == 'm' else v)
    return sorted(set(out), reverse=True)

def registration(s):
    if not s: return None
    s = str(s)
    if 'Esgotada' in s: return {'status': 'soldout', 'label': 'Esgotada'}
    m = re.findall(r'Fins al (\d\d/\d\d/\d{4})', s)
    lab = f"Inscripcions fins al {m[-1][:5]}" if m else None
    if 'dia de la cursa' in s: lab = (lab + ' · ' if lab else '') + 'També el mateix dia'
    return {'status': 'open', 'label': lab} if lab else None

def price(v):
    if v is None: return None
    return f"{v} €" if isinstance(v, (int, float)) else str(v)

wb = openpyxl.load_workbook(xlsx, data_only=True)
rows = [r for r in list(wb['Curses'].iter_rows(values_only=True))[1:] if r[1]]
out, seen = [], set()
for date, name, town, typ, dist, dplus, insc, pr, end, web, src in rows:
    lat, lng = MANUAL.get(town) or cent[norm(town)][:2]
    kms = km_list(dist)
    base = re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()).strip('-')[:48]
    rid = f"r-{date:%Y%m%d}-{base}"
    if rid in seen: continue
    seen.add(rid)
    r = {
        'id': rid, 'name': name.strip(), 'date': f"{date:%Y-%m-%d}",
        'endDate': f"{end:%Y-%m-%d}" if end and end != date else None,
        'town': TOWN_FIX.get(town, town), 'type': TYPE[typ],
        'distances': kms, 'distanceKm': kms[0] if kms else None,
        'elevation': dplus, 'registration': registration(insc), 'price': price(pr),
        'url': web or src, 'lat': lat, 'lng': lng,
        'challenge': any(c in name for c in CHALLENGE), 'featured': name.strip() == FEATURED,
    }
    if r['featured']:
        r['meetup'] = {'place': 'Arc de Triomf', 'time': '16:30',
                       'note': "Escalfem junts, anem a la sortida caminant i després brindem per l'any que ve. Porta la samarreta WURP si en tens.",
                       'i18n': {'es': {'note': 'Calentamos juntos, vamos andando a la salida y después brindamos por el año que viene. Trae la camiseta WURP si tienes.'},
                                'en': {'note': 'We warm up together, walk to the start and then toast to the year ahead. Wear your WURP tee if you have one.'}}}
    out.append(r)
out.sort(key=lambda r: r['date'])
json.dump(out, open('data/races.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'curses;', sum(r['challenge'] for r in out), 'amb repte;', sum(r['featured'] for r in out), 'destacada')
