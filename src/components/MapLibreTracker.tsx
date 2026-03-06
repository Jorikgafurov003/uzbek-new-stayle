import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { User, Order } from '../types';
import { BUKHARA_CENTER } from '../context/DataContext';

interface MapLibreTrackerProps {
  users: User[];
  orders: Order[];
  storeAddress?: string;
}

export const MapLibreTracker: React.FC<MapLibreTrackerProps> = ({ users, orders, storeAddress }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [key: string]: maplibregl.Marker }>({});

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/bright', // Free OSM style
      center: [BUKHARA_CENTER[1], BUKHARA_CENTER[0]], // MapLibre uses [lng, lat]
      zoom: 13,
      pitch: 45,
      bearing: -17.6
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add 3D buildings
      const style = map.current.getStyle();
      const sources = style.sources;
      const sourceName = Object.keys(sources).find(s => s.includes('openmaptiles') || s.includes('openfreemap')) || 'openmaptiles';

      const layers = style.layers;
      let labelLayerId;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
          labelLayerId = layers[i].id;
          break;
        }
      }

      if (sources[sourceName]) {
        map.current.addLayer(
          {
            'id': '3d-buildings',
            'source': sourceName,
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      }

      // Add Store Marker
      const storeEl = document.createElement('div');
      storeEl.className = 'store-marker';
      storeEl.innerHTML = `<div style="background-color: #D4AF37; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><img src="https://cdn-icons-png.flaticon.com/512/606/606547.png" style="width: 20px; height: 20px;" /></div>`;
      
      new maplibregl.Marker(storeEl)
        .setLngLat([BUKHARA_CENTER[1], BUKHARA_CENTER[0]])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>Магазин</b><br/>${storeAddress || 'Бухара, Узбекистан'}`))
        .addTo(map.current);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    const activeUsers = users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null);

    // Update or add markers
    activeUsers.forEach(u => {
      const id = String(u.id);
      const isOnline = u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000);
      const iconUrl = u.role === 'agent' 
        ? 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' 
        : 'https://cdn-icons-png.flaticon.com/512/2554/2554978.png';

      if (markers.current[id]) {
        // Smoothly move marker
        markers.current[id].setLngLat([Number(u.lng), Number(u.lat)]);
        // Update popup content if needed
      } else {
        const el = document.createElement('div');
        el.className = `marker-${u.role}`;
        el.innerHTML = `
          <div style="position: relative;">
            <div style="background-color: ${u.role === 'agent' ? '#3b82f6' : '#f97316'}; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
              <img src="${iconUrl}" style="width: 20px; height: 20px;" />
            </div>
            <div style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid white; background-color: ${isOnline ? '#22c55e' : '#94a3b8'};"></div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 5px; min-width: 150px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <img src="${u.photo || 'https://picsum.photos/seed/user/50/50'}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" />
              <div>
                <div style="font-weight: bold; font-size: 14px;">${u.name}</div>
                <div style="font-size: 10px; color: #888; text-transform: uppercase;">
                  ${u.role === 'agent' ? 'Агент' : 'Курьер'} • ${isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;"><b>Тел:</b> ${u.phone}</div>
            <div style="font-size: 10px; color: #aaa; margin-top: 8px;">Обновлено: ${u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'Только что'}</div>
          </div>
        `);

        markers.current[id] = new maplibregl.Marker(el)
          .setLngLat([Number(u.lng), Number(u.lat)])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    // Remove markers for users no longer in the list
    Object.keys(markers.current).forEach(id => {
      if (!activeUsers.find(u => String(u.id) === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });
  }, [users]);

  return (
    <div ref={mapContainer} className="w-full h-full rounded-3xl overflow-hidden shadow-inner" />
  );
};
