"""Convert the supplied city DBF without silently overwriting game data."""
import argparse
import json
import math
from pathlib import Path
from dbfread import DBF


def convert(source):
    cities = []
    for record in DBF(source, encoding='utf-8'):
        name = record.get('name')
        lat, lon = record.get('latitude'), record.get('longitude')
        if not isinstance(name, str) or not name.strip():
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat) > 90 or abs(lon) > 180:
            continue
        cities.append({'name': name.strip(), 'country': record.get('adm0name') or '',
                       'latitude': lat, 'longitude': lon})
    if not cities:
        raise ValueError('No valid cities found. Check the input fields and coordinates.')
    return cities


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', default='cities.dbf')
    parser.add_argument('--output', default='cities.generated.json', help='New file to create; existing files are never overwritten.')
    args = parser.parse_args()
    cities = convert(args.source)
    with Path(args.output).open('x', encoding='utf-8') as output:
        json.dump(cities, output, ensure_ascii=False, indent=2)
        output.write('\n')
    print(f'Exported {len(cities)} cities to {args.output}. Review before replacing cities.json.')


if __name__ == '__main__':
    main()
