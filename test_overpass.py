import urllib.request, urllib.parse, json

lat, lon = 26.1445, 91.7362
query = '[out:json][timeout:20];(node["amenity"~"hospital|clinic|school|community_centre"](around:5000,%s,%s););out 5;' % (lat, lon)
data = urllib.parse.urlencode({'data': query}).encode()

mirrors = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass-api.de/api/interpreter',
]

for mirror in mirrors:
    try:
        req = urllib.request.Request(mirror, data=data)
        req.add_header('User-Agent', 'JalSetuApp/1.0')
        with urllib.request.urlopen(req, timeout=20) as r:
            res = json.loads(r.read())
            print(f'SUCCESS [{mirror}] - {len(res["elements"])} results')
            for e in res['elements'][:2]:
                print(f'  - {e.get("tags",{}).get("name","?")}')
            break
    except Exception as e:
        print(f'FAILED [{mirror}] - {str(e)[:60]}')
