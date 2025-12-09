import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { startAssignment, updateLocation } from '../api/assignmentStart';
import { requestLocationPermission } from '../utils/requestLocationPermission';

interface Props {
  assignmentId: string | number;
  enabled: boolean;
  intervalMs: number;
  onLocationUpdate?: (coords: string) => void;
}

type Coords = { lat: number; lng: number };

const DEFAULT_COORDS: Coords = { lat: 0, lng: 0 };

const useLocationTracking = ({ assignmentId, enabled, intervalMs, onLocationUpdate }: Props) => {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askingPermissionRef = useRef(false);

  // --- Helper: pedir ubicación con mejor manejo ---
  const getLocation = (): Promise<Coords> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (error) => reject(error),
        {
          enableHighAccuracy: false, // Specified
          timeout: 30000,            // Specified
          maximumAge: 1000,          // Specified
        }
      );
    });
  };

  // --- Chequear si Location Services están activos (Android-only) ---
  const checkLocationServices = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      return await new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          () => resolve(true),
          (error) => {
            console.log('checkLocationServices internal error:', error);
            // code === 2: POSITION_UNAVAILABLE (GPS apagado o provider deshabilitado)
            if (error?.code === 2) resolve(false);
            else resolve(true);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        );
      });
    } catch (e) {
      console.warn('checkLocationServices threw:', e);
      // En caso de crash de la librería, asumimos true para no bloquear,
      // o false si queremos ser estrictos.
      return true; 
    }
  };

  // --- Reintentos simples con backoff para lecturas fallidas ---
  const getLocationWithRetry = async (retries = 2): Promise<Coords> => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const c = await getLocation();
        return c;
      } catch (err: any) {
        console.log('getLocation error:', err?.code, err?.message);
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(() => r(undefined), 1500 * (attempt + 1))); // backoff
        attempt++;
      }
    }
    throw new Error('No se pudo obtener ubicación tras varios intentos.');
  };

  const startInterval = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      try {
        let coords: Coords;
        try {
          coords = await getLocationWithRetry();
        } catch (locErr) {
          console.log('⚠️ No se obtuvo ubicación para update; usando coordenadas por defecto', locErr);
          coords = DEFAULT_COORDS;
        }
        const now = new Date().toISOString();

        const payload = {
          currentLocation: {
            latitude: coords.lat,
            longitude: coords.lng,
            updatedAt: now,
          },
        };

        try {
          await updateLocation(assignmentId, payload);
          if (onLocationUpdate) onLocationUpdate(`${coords.lat}, ${coords.lng}`);
          console.log('📡 Ubicación enviada:', payload);
        } catch (e) {
          console.log('⚠️ Error enviando ubicación (update), se mantiene el flujo:', e);
        }
      } catch (e: any) {
        // Manejo suave de errores: no crashea, solo informa
        console.log('⚠️ Error enviando ubicación:', e?.message ?? e);
      }
    }, intervalMs);
  };

  const sendCheckIn = async () => {
    try {
      let coords: Coords;
      let attempts = 0;
      const maxAttempts = 3;

      // Retry loop specifically for check-in to avoid sending 0,0
      while (attempts < maxAttempts) {
        try {
          coords = await getLocationWithRetry();
          if (coords.lat !== 0 || coords.lng !== 0) break;
        } catch (locErr) {
          console.log(`Check-in location attempt ${attempts + 1} failed:`, locErr);
        }
        attempts++;
        if (attempts < maxAttempts) await new Promise(r => setTimeout(r, 2000));
      }

      // Final check: if still 0,0, do NOT send.
      // Note: We use a type assertion or check logic. 
      // Since we initialized coords inside loop, we need to be careful.
      // Let's re-fetch or fail.
      if (!coords! || (coords.lat === 0 && coords.lng === 0)) {
         throw new Error("No se pudo obtener una ubicación válida (distinta de 0,0).");
      }

      const now = new Date().toISOString();

      const payload = {
        checkIn: now,
        currentLocation: {
          latitude: coords.lat,
          longitude: coords.lng,
          updatedAt: now,
        },
      };

      console.log('🟢 Enviando CHECK-IN (Valid coords):', payload);
      await startAssignment(assignmentId, payload);
      setHasCheckedIn(true);
      if (onLocationUpdate) onLocationUpdate(`${coords.lat}, ${coords.lng}`);
    } catch (err: any) {
      console.log('❌ Error enviando CHECK-IN:', err?.message ?? err);
      const serverError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      Alert.alert(
        'Error de Ubicación',
        `No se pudo enviar el Check-In porque no se obtuvo una ubicación válida. (${serverError})`,
        [{ text: 'Reintentar', onPress: () => sendCheckIn() }, { text: 'Cancelar', style: 'cancel' }]
      );
    }
  };

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const init = async () => {
      try {
        // Evitar doble diálogo concurrente
        if (askingPermissionRef.current) return;
        askingPermissionRef.current = true;

        const hasPermission = await requestLocationPermission();
        askingPermissionRef.current = false;
        
        if (!hasPermission) {
          Alert.alert(
            'Permiso requerido',
            'Activa el permiso de ubicación para continuar.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        // Chequear Location Services (GPS / providers)
        const servicesActive = await checkLocationServices();
        if (!servicesActive) {
          Alert.alert(
            'Ubicación desactivada',
            'Activa la ubicación/GPS del dispositivo para continuar.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        // Importante: pequeña espera tras permiso para evitar crash en algunos OEMs
        await new Promise((r) => setTimeout(() => r(undefined), 300));

        if (!hasCheckedIn && isMounted) {
          await sendCheckIn();
        }

        startInterval();
      } catch (e: any) {
        console.log('Error inicializando tracking:', e?.message ?? e);
        Alert.alert(
          'Error de ubicación',
          `No se pudo iniciar el tracking. Detalle: ${e?.message ?? JSON.stringify(e)}`,
          [{ text: 'OK' }]
        );
      }
    };

    init();

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return {};
};

export default useLocationTracking;