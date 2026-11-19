import json, math, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
LAT0 = 41.7; K = math.cos(math.radians(LAT0))
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 0.15, 3.35, 40.50, 42.88
W = 1000
S = W / ((LON_MAX - LON_MIN) * K)
H = round((LAT_MAX - LAT_MIN) * S)
def P(lon, lat): return ((lon - LON_MIN) * K * S, (LAT_MAX - lat) * S)

def dp(pts, eps):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0]=keep[-1]=True; st=[(0,len(pts)-1)]
    while st:
        a,b = st.pop(); ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy) or 1e-9
        mi,md=-1,0
        for i in range(a+1,b):
            px,py=pts[i]; dd=abs(dy*px-dx*py+bx*ay-by*ax)/L
            if dd>md: md,mi=dd,i
        if md>eps: keep[mi]=True; st+= [(a,mi),(mi,b)]
    return [p for p,k in zip(pts,keep) if k]

def ring_area(r): return sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r)))/2
def centroid(r):
    A=-ring_area(r) or 1e-9; cx=cy=0
    for i in range(len(r)):
        x0,y0=r[i-1]; x1,y1=r[i]; c=x0*y1-x1*y0; cx+=(x0+x1)*c; cy+=(y0+y1)*c
    return cx/(6*A), cy/(6*A)

paths=[]; labels=[]
for f in sorted(d['features'], key=lambda f: f['properties']['nom_comar']):
    g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    dstr=[]; big=None
    for poly in polys:
        for ring in poly:
            pts=[P(*c) for c in ring]; m=len(pts)//2
            r=dp(pts[:m+1],0.45)[:-1]+dp(pts[m:],0.45)
            if len(r)<4 or abs(ring_area(r))<0.5: continue
            if big is None or abs(ring_area(r))>abs(ring_area(big)): big=r
            dstr.append('M'+'L'.join(f'{x:.1f} {y:.1f}' for x,y in r)+'Z')
    name=f['properties']['nom_comar']; prov=f['properties']['provincia']
    paths.append(f'<path class="cat-com p{prov}" d="{"".join(dstr)}"><title>{name}</title></path>')
    cx,cy=centroid(big); labels.append(f'<text x="{cx:.0f}" y="{cy:.0f}">{name}</text>')

cities=[('Barcelona',2.1734,41.3851),('Girona',2.8214,41.9794),('Lleida',0.6200,41.6176),('Tarragona',1.2445,41.1189),
        ('Manresa',1.8262,41.7251),('Vic',2.2546,41.9301),('Terrassa',2.0089,41.5633),('Sabadell',2.1086,41.5463),
        ('Mataró',2.4445,41.5381),('Reus',1.1069,41.1561),('Tortosa',0.5214,40.8125),('Figueres',2.9614,42.2672),
        ('la Seu d\'Urgell',1.4594,42.3580),('Puigcerdà',1.9277,42.4317),('Vielha',0.7964,42.7023),('Vilanova i la Geltrú',1.7257,41.2241)]
cdots=''.join(f'<g class="cat-city"><circle cx="{P(lo,la)[0]:.1f}" cy="{P(lo,la)[1]:.1f}" r="2.2"/><text x="{P(lo,la)[0]+5:.1f}" y="{P(lo,la)[1]+3.5:.1f}">{n}</text></g>' for n,lo,la in cities)
sea_x,sea_y=P(2.75,41.05)
allp=''.join(paths)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" data-proj="{LON_MIN},{LAT_MAX},{K:.6f},{S:.4f}" class="cat-map">
<!-- Catalunya per comarques. Generat amb scripts/gen_map.py (dades: sirisacademic/catalonia-cartography). -->
<style>:where(.cat-com){{fill:#F4EFEA;stroke:#C9B9AC;stroke-width:.8}}:where(.cat-outline .cat-com){{fill:none;stroke:#6D1730;stroke-width:3}}:where(.cat-labels,.cat-cities,.cat-sea){{display:none}}</style>
<use href="#cat-com" class="cat-outline"/>
<g id="cat-com" class="cat-fill">{allp}</g>
<g class="cat-labels" aria-hidden="true">{''.join(labels)}</g>
<g class="cat-cities" aria-hidden="true">{cdots}</g>
<text class="cat-sea" x="{sea_x:.0f}" y="{sea_y:.0f}" aria-hidden="true">Mar Mediterrània</text>
</svg>'''
open(out,'w').write(svg)
print(W,H,len(svg)//1024,'KB')
