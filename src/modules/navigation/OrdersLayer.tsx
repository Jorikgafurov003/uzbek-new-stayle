import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Order, Shop } from '../../types';

interface OrdersLayerProps {
    map: maplibregl.Map;
    orders: Order[];
    shops: Shop[];
}

export const OrdersLayer: React.FC<OrdersLayerProps> = ({ map, orders, shops }) => {
    const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

    useEffect(() => {
        // Clear old markers that are no longer needed
        const currentOrderIds = new Set(orders.map(o => `order-${o.id}`));
        const currentShopIds = new Set(shops.map(s => `shop-${s.id}`));

        Object.keys(markersRef.current).forEach(id => {
            if (!currentOrderIds.has(id) && !currentShopIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Add Shop Markers
        shops.forEach(shop => {
            const id = `shop-${shop.id}`;
            if (markersRef.current[id]) {
                markersRef.current[id].setLngLat([Number(shop.longitude), Number(shop.latitude)]);
            } else if (shop.latitude && shop.longitude) {
                const el = document.createElement('div');
                el.className = 'marker-shop';
                el.innerHTML = `
          <div style="background-color: #8b5cf6; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <img src="https://cdn-icons-png.flaticon.com/512/606/606547.png" style="width: 16px; height: 16px; filter: brightness(0) invert(1);" />
          </div>
        `;

                const marker = new maplibregl.Marker(el)
                    .setLngLat([Number(shop.longitude), Number(shop.latitude)])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>${shop.name}</b><br/>${shop.address}`))
                    .addTo(map);

                markersRef.current[id] = marker;
            }
        });

        // Add Delivery/Order Markers
        orders.forEach(order => {
            const id = `order-${order.id}`;
            if (markersRef.current[id]) {
                markersRef.current[id].setLngLat([Number(order.longitude), Number(order.latitude)]);
            } else if (order.latitude && order.longitude) {
                const el = document.createElement('div');
                el.className = 'marker-order';
                el.innerHTML = `
          <div style="background-color: #ef4444; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <img src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png" style="width: 16px; height: 16px; filter: brightness(0) invert(1);" />
          </div>
        `;

                const marker = new maplibregl.Marker(el)
                    .setLngLat([Number(order.longitude), Number(order.latitude)])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>${order.clientName}</b><br/>${order.location}<br/>Заказ #${order.id}`))
                    .addTo(map);

                markersRef.current[id] = marker;
            }
        });
    }, [map, orders, shops]);

    return null;
};
