import { useState, useEffect, useCallback } from 'react';

interface Location {
    lat: number;
    lng: number;
    accuracy: number;
}

export const useLocation = (enableHighAccuracy = true) => {
    const [location, setLocation] = useState<Location | null>(null);
    const [error, setError] = useState<string | null>(null);

    const updateLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setError(null);
            },
            (err) => {
                setError(err.message);
            },
            {
                enableHighAccuracy,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }, [enableHighAccuracy]);

    useEffect(() => {
        updateLocation();

        // Setup watcher for couriers
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (err) => setError(err.message),
            { enableHighAccuracy, timeout: 5000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [updateLocation, enableHighAccuracy]);

    return { location, error, refresh: updateLocation };
};
