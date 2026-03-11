export interface RouteResponse {
    geometry: any;
    distance: number;
    duration: number;
}

export class RouteEngine {
    private baseUrl = "https://router.project-osrm.org/route/v1/driving/";

    async getRoute(start: [number, number], end: [number, number]): Promise<RouteResponse | null> {
        try {
            // OSRM expects [lng, lat]
            const response = await fetch(
                `${this.baseUrl}${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`
            );
            const data = await response.json();

            if (data.code === "Ok" && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    geometry: route.geometry,
                    distance: route.distance,
                    duration: route.duration,
                };
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch route from OSRM:", error);
            return null;
        }
    }
}

export const routeEngine = new RouteEngine();
