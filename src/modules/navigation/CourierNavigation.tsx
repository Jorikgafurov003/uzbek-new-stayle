import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { gpsService } from './GPSService';
import { routeEngine } from './RouteEngine';
import { CourierLayer } from './CourierLayer';
import { OrdersLayer } from './OrdersLayer';
import { Order, Shop, User } from '../../types';
import { BUKHARA_CENTER } from '../../context/DataContext';

interface CourierNavigationProps {
    user: User;
    orders: Order[];
    shops: Shop[];
    activeOrderId?: number | null;
    onLocationUpdate?: (lat: number, lng: number, speed: number) => void;
}

export const CourierNavigation: React.FC<CourierNavigationProps> = ({
    user,
    orders,
    shops,
    activeOrderId,
    onLocationUpdate
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [courierPos, setCourierPos] = useState<[number, number]>([user.lng || BUKHARA_CENTER[1], user.lat || BUKHARA_CENTER[0]]);
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tiles.openfreemap.org/styles/bright',
            center: courierPos,
            zoom: 15,
            pitch: 45,
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true
        }), 'top-right');

        map.on('load', () => {
            setMapLoaded(true);

            // Add 3D buildings layer
            const style = map.getStyle();
            const sources = style.sources;
            const sourceName = Object.keys(sources).find(s => s.includes('openmaptiles') || s.includes('openfreemap')) || 'openmaptiles';

            if (sources[sourceName]) {
                map.addLayer({
                    'id': '3d-buildings',
                    'source': sourceName,
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 15,
                    'paint': {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.6
                    }
                });
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Tracking Effect
    useEffect(() => {
        gpsService.startTracking(
            (pos) => {
                const { latitude, longitude, heading, speed } = pos.coords;
                setCourierPos([longitude, latitude]);
                if (heading !== null) setHeading(heading);

                if (onLocationUpdate) {
                    onLocationUpdate(latitude, longitude, speed || 0);
                }

                if (mapRef.current) {
                    mapRef.current.easeTo({
                        center: [longitude, latitude],
                        duration: 1000
                    });
                }
            },
            (err) => console.error("GPS Error:", err)
        );

        return () => gpsService.stopTracking();
    }, [onLocationUpdate]);

    // Routing Effect
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !activeOrderId) {
            if (mapRef.current?.getSource('route')) {
                (mapRef.current.getSource('route') as maplibregl.GeoJSONSource).setData({
                    type: 'FeatureCollection',
                    features: []
                });
            }
            return;
        }

        const activeOrder = orders.find(o => o.id === activeOrderId);
        if (!activeOrder || !activeOrder.latitude || !activeOrder.longitude) return;

        const fetchRoute = async () => {
            const routeData = await routeEngine.getRoute(courierPos, [activeOrder.longitude, activeOrder.latitude]);
            if (routeData && mapRef.current) {
                const sourceId = 'route';
                const geojson = {
                    type: 'Feature',
                    properties: {},
                    geometry: routeData.geometry
                };

                if (mapRef.current.getSource(sourceId)) {
                    (mapRef.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson as any);
                } else {
                    mapRef.current.addSource(sourceId, {
                        type: 'geojson',
                        data: geojson as any
                    });

                    mapRef.current.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: sourceId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#D4AF37', 'line-width': 6, 'line-opacity': 0.8 }
                    });
                }
            }
        };

        fetchRoute();
    }, [mapLoaded, activeOrderId, courierPos, orders]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />
            {mapLoaded && mapRef.current && (
                <>
                    <CourierLayer map={mapRef.current} coordinates={courierPos} heading={heading} />
                    <OrdersLayer map={mapRef.current} orders={orders} shops={shops} />
                </>
            )}
        </div>
    );
};
