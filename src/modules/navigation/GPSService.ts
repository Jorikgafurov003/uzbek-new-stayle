export class GPSService {
    private watchId: number | null = null;

    startTracking(onUpdate: (pos: GeolocationPosition) => void, onError: (err: GeolocationPositionError) => void) {
        if (!navigator.geolocation) {
            console.error("Geolocation is not supported by this browser.");
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => onUpdate(pos),
            (err) => onError(err),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            });
        });
    }
}

export const gpsService = new GPSService();
