import json
from dbfread import DBF

# Replace with your actual file path
dbf_file = 'cities.dbf'
output_json = 'seedData.json'
extracted_data = []

# Open the DBF and extract the required fields
# IMPORTANT: Replace the string keys with the exact column headers from your DBF
for record in DBF(dbf_file):
    city_node = {
        "name": record.get('CITY_NAME'),      # e.g., 'NAME', 'CITY'
        "country": record.get('COUNTRY'),     # e.g., 'CNTRY', 'COUNTRY'
        "latitude": record.get('LATITUDE'),   # e.g., 'LAT', 'Y'
        "longitude": record.get('LONGITUDE')  # e.g., 'LON', 'X'
    }
    
    # Only append if coordinate data exists
    if city_node['latitude'] is not None and city_node['longitude'] is not None:
        extracted_data.append(city_node)

# Export to JSON
with open(output_json, 'w') as f:
    json.dump(extracted_data, f, indent=2)

print(f"Successfully exported {len(extracted_data)} cities to {output_json}")