const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/';

let currentRouteLayer = null;

async function getRoute(start, end) {
    const url = `${OSRM_BASE}${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok') {
            const route = data.routes[0];
            drawRoute(route.geometry);
            return {
                distance: (route.distance / 1000).toFixed(1), // km
                duration: Math.round(route.duration / 60) // minutes
            };
        }
    } catch (e) {
        console.error('Routing error:', e);
    }
    return null;
}

function drawRoute(geojson) {
    if (map.getSource('route')) {
        map.getSource('route').setData(geojson);
    } else {
        map.addSource('route', {
            'type': 'geojson',
            'data': geojson
        });

        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#ffcc00',
                'line-width': 8,
                'line-opacity': 0.8
            }
        });
    }
}

// GPS Tracking Logic
function startTracking(callback) {
    if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    navigator.geolocation.watchPosition((pos) => {
        const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            speed: Math.round((pos.coords.speed || 0) * 3.6), // km/h
            heading: pos.coords.heading || 0
        };
        callback(coords);
    }, (err) => {
        console.warn('Geolocation error:', err);
    }, options);
}

// Simple Address Search (Nominatim - FREE)
async function searchAddress(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
    } catch (e) {
        console.error('Search error:', e);
    }
    return null;
}
