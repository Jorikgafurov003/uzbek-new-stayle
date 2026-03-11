import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { User, Order, Shop } from '../../types';
import { BUKHARA_CENTER } from '../../context/DataContext';

interface MapLibreTrackerProps {
  users: User[];
  orders: Order[];
  shops?: Shop[];
  storeAddress?: string;
  warehouseLat?: number;
  warehouseLng?: number;
  onDeleteShop?: (shopId: number) => void;
}

export const MapLibreTracker: React.FC<MapLibreTrackerProps> = ({ users, orders, shops, storeAddress, warehouseLat, warehouseLng, onDeleteShop }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const markers = useRef<{ [key: string]: maplibregl.Marker }>({});
  const storeMarker = useRef<maplibregl.Marker | null>(null);

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
      setIsMapReady(true);

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
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isMapReady) return;

    if (!storeMarker.current) {
      const storeEl = document.createElement('div');
      storeEl.className = 'store-marker';
      storeEl.innerHTML = `<div style="background-color: #D4AF37; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><img src="https://cdn-icons-png.flaticon.com/512/606/606547.png" style="width: 20px; height: 20px;" /></div>`;

      storeMarker.current = new maplibregl.Marker(storeEl)
        .setLngLat([warehouseLng || BUKHARA_CENTER[1], warehouseLat || BUKHARA_CENTER[0]])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>Склад</b><br/>${storeAddress || 'Бухара, Узбекистан'}`))
        .addTo(map.current);
    } else {
      storeMarker.current.setLngLat([warehouseLng || BUKHARA_CENTER[1], warehouseLat || BUKHARA_CENTER[0]]);
      storeMarker.current.getPopup().setHTML(`<b>Склад</b><br/>${storeAddress || 'Бухара, Узбекистан'}`);
    }
  }, [isMapReady, warehouseLat, warehouseLng, storeAddress]);

  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const activeUsers = users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null);

    // Update or add user markers
    activeUsers.forEach(u => {
      const id = String(u.id);
      const isOnline = u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000);
      const iconUrl = u.role === 'agent'
        ? 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png'
        : 'https://cdn-icons-png.flaticon.com/512/2554/2554978.png';

      const lat = Number(u.lat);
      const lng = Number(u.lng);

      if (isNaN(lat) || isNaN(lng)) return;

      if (markers.current[id]) {
        markers.current[id].setLngLat([lng, lat]);
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
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    // Register global delete callback for shop popups
    (window as any).__deleteShop = (shopId: number) => {
      if (onDeleteShop) onDeleteShop(shopId);
    };

    // Update or add shop markers
    if (shops) {
      shops.forEach(shop => {
        const id = `shop-${shop.id}`;
        const lat = Number(shop.latitude);
        const lng = Number(shop.longitude);

        if (isNaN(lat) || isNaN(lng)) return;

        if (markers.current[id]) {
          markers.current[id].setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'marker-shop';
          el.innerHTML = `
            <div style="background-color: #8b5cf6; padding: 10px; border-radius: 50%; border: 3px solid white; box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' width='20' height='20'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22' style='fill:none;stroke:white;stroke-width:2'/></svg>
            </div>
          `;

          const agentInfo = (shop as any).agentName ? `<div style="font-size:10px;color:#6d28d9;font-weight:600;">👤 Агент: ${(shop as any).agentName}</div>` : '';
          const deleteBtn = onDeleteShop
            ? `<button onclick="window.__deleteShop(${shop.id})" style="margin-top:8px;width:100%;background:#ef4444;color:white;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.05em;">🗑 Удалить</button>`
            : '';

          const popup = new maplibregl.Popup({ offset: 30, maxWidth: '200px' }).setHTML(`
            <div style="padding:8px;min-width:180px;font-family:sans-serif;">
              <div style="font-weight:800;font-size:14px;color:#1e1b4b;margin-bottom:4px;">${shop.name}</div>
              <div style="font-size:11px;color:#555;margin-bottom:3px;">📍 ${shop.address}</div>
              ${shop.clientName ? `<div style="font-size:10px;color:#888;">🏢 ${shop.clientName}</div>` : ''}
              ${agentInfo}
              ${deleteBtn}
            </div>
          `);

          markers.current[id] = new maplibregl.Marker(el)
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map.current!);
        }
      });
    }

    // Remove markers for users/shops no longer in the list
    Object.keys(markers.current).forEach(id => {
      if (id.startsWith('shop-')) {
        const shopIdStr = id.replace('shop-', '');
        if (!shops || !shops.find(s => String(s.id) === shopIdStr)) {
          markers.current[id].remove();
          delete markers.current[id];
        }
      } else {
        if (!activeUsers.find(u => String(u.id) === id)) {
          markers.current[id].remove();
          delete markers.current[id];
        }
      }
    });

    // Handle OSRM Routing for Active Deliveries
    const activeOrders = orders.filter(o => (o.orderStatus === 'confirmed' || o.orderStatus === 'on_way') && o.courierId && o.latitude && o.longitude);

    // Create a feature collection for all routes
    const fetchRoutes = async () => {
      const features: any[] = [];

      for (const order of activeOrders) {
        const courier = activeUsers.find(u => String(u.id) === String(order.courierId));
        if (!courier || !courier.lat || !courier.lng) continue;

        try {
          // OSRM Request Format: lon,lat;lon,lat
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${courier.lng},${courier.lat};${order.longitude},${order.latitude}?geometries=geojson`);
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            features.push({
              type: 'Feature',
              properties: { orderId: order.id },
              geometry: data.routes[0].geometry
            });
          }
        } catch (e) {
          console.error("OSRM Route fetch failed:", e);
        }
      }

      if (map.current && map.current.isStyleLoaded()) {
        const sourceId = 'active-routes';
        const geojson = {
          type: 'FeatureCollection',
          features
        };

        if (map.current.getSource(sourceId)) {
          (map.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson as any);
        } else {
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: geojson as any
          });

          map.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#D4AF37', // Gold color for the route
              'line-width': 4,
              'line-opacity': 0.8
            }
          });

          map.current.addLayer({
            id: 'route-line-outline',
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#000000',
              'line-width': 6,
              'line-opacity': 0.3
            }
          }, 'route-line'); // Ensure outline is behind the main line
        }
      }
    };

    fetchRoutes();

  }, [users, orders, shops, isMapReady]);


  return (
    <div ref={mapContainer} className="w-full h-full rounded-3xl overflow-hidden shadow-inner relative z-0" />
  );
};
