async function fetchCityPairs(count = 5) {
    try {
        const response = await fetch('cities.json');
        if (!response.ok) {
            throw new Error(`Could not load cities.json (Status: ${response.status})`);
        }
        
        const rawData = await response.json();

        // Unwrap data if nested in an object (e.g., GeoJSON features, { cities: [...] }, or { data: [...] })
        let cities = [];
        if (Array.isArray(rawData)) {
            cities = rawData;
        } else if (Array.isArray(rawData.features)) {
            cities = rawData.features;
        } else if (Array.isArray(rawData.cities)) {
            cities = rawData.cities;
        } else if (Array.isArray(rawData.data)) {
            cities = rawData.data;
        } else {
            const arrayKey = Object.keys(rawData).find(key => Array.isArray(rawData[key]));
            if (arrayKey) cities = rawData[arrayKey];
        }

        if (!cities || cities.length === 0) {
            throw new Error("cities.json does not contain a valid array of items.");
        }

        // Helper to extract country name across various dataset formats
        const getCountry = (c) => {
            const props = c.properties || c;
            return props.country || props.COUNTRY || props.adm0name || props.ADM0NAME || props.admin || props.ADMIN || props.sovereignt || props.SOVEREIGNT || '';
        };

        // Extract city name and format as "City, Country"
        const getName = (c) => {
            const props = c.properties || c;
            const cityName = props.name || props.NAME || props.city || props.CITY || props.capital || 'Unknown City';
            const countryName = getCountry(c);

            if (cityName === 'Unknown City') return 'Unknown City';
            return countryName ? `${cityName}, ${countryName}` : cityName;
        };

        const getLat = (c) => {
            const props = c.properties || c;
            if (props.lat !== undefined) return parseFloat(props.lat);
            if (props.LATITUDE !== undefined) return parseFloat(props.LATITUDE);
            if (props.latitude !== undefined) return parseFloat(props.latitude);
            if (c.coordinates?.lat !== undefined) return parseFloat(c.coordinates.lat);
            if (c.geometry?.coordinates?.[1] !== undefined) return parseFloat(c.geometry.coordinates[1]);
            return undefined;
        };

        const getLon = (c) => {
            const props = c.properties || c;
            if (props.lon !== undefined) return parseFloat(props.lon);
            if (props.lng !== undefined) return parseFloat(props.lng);
            if (props.LONGITUDE !== undefined) return parseFloat(props.LONGITUDE);
            if (props.longitude !== undefined) return parseFloat(props.longitude);
            if (c.coordinates?.lon !== undefined) return parseFloat(c.coordinates.lon);
            if (c.geometry?.coordinates?.[0] !== undefined) return parseFloat(c.geometry.coordinates[0]);
            return undefined;
        };

        const toRad = (deg) => (deg * Math.PI) / 180;
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Earth radius in km
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
            return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        };

        const pairs = [];
        const seenPairs = new Set();
        let attempts = 0;

        while (pairs.length < count && attempts < 1000) {
            attempts++;
            const rawA = cities[Math.floor(Math.random() * cities.length)];
            const rawB = cities[Math.floor(Math.random() * cities.length)];

            if (!rawA || !rawB) continue;

            const nameA = getName(rawA);
            const nameB = getName(rawB);

            if (nameA === nameB || nameA === 'Unknown City' || nameB === 'Unknown City') continue;

            const pairKey = [nameA, nameB].sort().join('::');
            if (seenPairs.has(pairKey)) continue;

            const latA = getLat(rawA);
            const lonA = getLon(rawA);
            const latB = getLat(rawB);
            const lonB = getLon(rawB);

            if (isNaN(latA) || isNaN(lonA) || isNaN(latB) || isNaN(lonB)) continue;

            seenPairs.add(pairKey);

            const distanceKm = calculateDistance(latA, lonA, latB, lonB);

            pairs.push({
                cityA: { name: nameA, coordinates: { lat: latA, lon: lonA } },
                cityB: { name: nameB, coordinates: { lat: latB, lon: lonB } },
                distanceKm
            });
        }

        if (pairs.length === 0) {
            throw new Error("Could not find valid city coordinate pairs in cities.json.");
        }

        return pairs;
    } catch (error) {
        console.error("Game setup error:", error);
        const locationElem = document.getElementById('location-text');
        if (locationElem) locationElem.textContent = "Error parsing cities.json";
        return [];
    }
}
