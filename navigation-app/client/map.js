// MapLibre Configuration
const INITIAL_CENTER = [64.4286, 39.7747]; // Bukhara [lon, lat]
const INITIAL_ZOOM = 13;

let map;
let userMarker;
let entityMarkers = {};
let isNavigating = false;

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        // Using a clear dark style from OpenFreeMap
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        pitch: 0,
        bearing: 0,
        antialias: true
    });

    map.on('load', () => {
        // Add 3D Buildings
        map.addLayer({
            'id': '3d-buildings',
            'source': 'openmaptiles',
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#333',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.6
            }
        });

        console.log('Map loaded with 3D buildings');
    });

    // Custom marker for User
    const el = document.createElement('div');
    el.className = 'user-marker';
    const ping = document.createElement('div');
    ping.className = 'location-ping';
    el.appendChild(ping);

    userMarker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat(INITIAL_CENTER)
        .addTo(map);
}

// Update other entities (couriers, etc.)
function updateEntitiesOnMap(entities) {
    entities.forEach(entity => {
        if (entityMarkers[entity.id]) {
            // Update existing
            entityMarkers[entity.id].setLngLat([entity.lon, entity.lat]);
            // Animate rotation if heading is provided
            if (entity.heading !== undefined) {
                entityMarkers[entity.id].setRotation(entity.heading);
            }
        } else {
            // Create new
            const el = document.createElement('div');
            el.className = 'courier-marker';
            el.innerHTML = entity.role === 'courier' ? '📦' : '🚗';

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([entity.lon, entity.lat])
                .addTo(map);

            entityMarkers[entity.id] = marker;
        }
    });

    // Remove inactive
    const activeIds = entities.map(e => e.id);
    Object.keys(entityMarkers).forEach(id => {
        if (!activeIds.includes(id)) {
            entityMarkers[id].remove();
            delete entityMarkers[id];
        }
    });
}

function focusOnLocation(lat, lon, zoom = 16, bearing = 0, pitch = 45) {
    map.flyTo({
        center: [lon, lat],
        zoom: zoom,
        bearing: bearing,
        pitch: pitch,
        essential: true,
        duration: 2000
    });
}

function toggleNavigationMode(active) {
    isNavigating = active;
    if (active) {
        map.easeTo({ pitch: 60, zoom: 18, duration: 1000 });
    } else {
        map.easeTo({ pitch: 0, zoom: 15, duration: 1000, bearing: 0 });
    }
}
