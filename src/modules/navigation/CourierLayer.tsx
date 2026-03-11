import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface CourierLayerProps {
    map: maplibregl.Map;
    coordinates: [number, number]; // [lng, lat]
    heading?: number;
}

export const CourierLayer: React.FC<CourierLayerProps> = ({ map, coordinates, heading }) => {
    const markerRef = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        const el = document.createElement('div');
        el.className = 'courier-marker';
        el.innerHTML = `
      <div style="position: relative;">
        <div style="background-color: #f97316; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: transform 0.2s ease;">
          <img src="https://cdn-icons-png.flaticon.com/512/2554/2554978.png" style="width: 24px; height: 24px;" />
        </div>
        <div style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid white; background-color: #22c55e;"></div>
      </div>
    `;

        markerRef.current = new maplibregl.Marker(el)
            .setLngLat(coordinates)
            .addTo(map);

        return () => {
            markerRef.current?.remove();
        };
    }, [map]);

    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setLngLat(coordinates);

            const el = markerRef.current.getElement();
            const icon = el.querySelector('div > div:first-child') as HTMLElement;
            if (icon && heading !== undefined) {
                icon.style.transform = `rotate(${heading}deg)`;
            }
        }
    }, [coordinates, heading]);

    return null;
};
