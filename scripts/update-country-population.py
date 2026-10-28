"""Extract a reviewed, same-year population snapshot from the official UN WPP files.

Usage: python3 scripts/update-country-population.py --year 2026
The checked-in snapshot makes normal imports and builds work offline.
"""
import argparse
import csv
import datetime
import decimal
import gzip
import hashlib
import io
import json
import pathlib
import urllib.request
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--year', type=int, default=2026)
parser.add_argument('--retrieved-at', default=datetime.date.today().isoformat())
args = parser.parse_args()
if not 2024 <= args.year <= 2100:
    parser.error('WPP 2024 medium projections cover 2024–2100.')
root = pathlib.Path(__file__).resolve().parent
base = 'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/'
files = [
    ('WPP2024_Demographic_Indicators_Medium.csv.gz', base + 'CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz'),
    ('WPP2024_CSV_files_update.zip', base + 'WPP2024_CSV_files_update.zip'),
]
countries = {}
downloads = []
for name, url in files:
    cache = root / '.cache' / name
    cache.parent.mkdir(parents=True, exist_ok=True)
    if not cache.exists():
        urllib.request.urlretrieve(url, cache)
    raw = cache.read_bytes()
    downloads.append({'url': url, 'sha256': hashlib.sha256(raw).hexdigest()})
    if name.endswith('.gz'):
        text = gzip.decompress(raw).decode('utf-8-sig')
    else:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            text = archive.read('WPP2024_Demographic_Indicators_Medium_Update.csv').decode('utf-8-sig')
    for row in csv.DictReader(io.StringIO(text)):
        if row['Time'] == str(args.year) and row['ISO3_code'] and row['Variant'] == 'Medium':
            # WPP publishes thousands; convert to persons using decimal arithmetic.
            countries[row['ISO3_code']] = int(decimal.Decimal(row['TPopulation1July']) * 1000)
if len(countries) != 237:
    raise ValueError(f'Expected 237 countries/areas, received {len(countries)}')
snapshot = {
    'source': 'UN World Population Prospects 2024',
    'source_url': 'https://population.un.org/wpp/',
    'license': 'CC BY 3.0 IGO',
    'reference_date': f'{args.year}-07-01',
    'method': 'projection',
    'variant': 'Medium',
    'interim_update': '2026-01-19 (Togo)',
    'retrieved_at': args.retrieved_at,
    'downloads': downloads,
    'countries': dict(sorted(countries.items())),
}
target = root / 'data' / 'country-population.json'
target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
print(f'{len(countries)} UN population projections for {args.year}: {target}')
