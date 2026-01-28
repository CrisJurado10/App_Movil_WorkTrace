import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions'; // <--- LA CLAVE
import { startAssignment, updateLocation } from '../api/assignmentStart';
import { requestLocationPermission } from '../utils/requestLocationPermission';

interface Props {
  assignmentId: string | number;
  enabled: boolean;
  intervalMs: number;
  onLocationUpdate?: (coords: string) => void;
  onFinish?: () => void;
}

type Coords = { lat: number; lng: number };

const DEFAULT_COORDS: Coords = { lat: 0, lng: 0 };

// Función de espera segura para el loop
const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const useLocationTracking = ({ assignmentId, enabled, intervalMs, onLocationUpdate, onFinish }: Props) => {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const askingPermissionRef = useRef(false);

  // --- 1. Obtener Coordenadas (Tu lógica original mejorada) ---
  const getLocation = (): Promise<Coords> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
          forceRequestLocation: true, // Forzar lectura hardware
        }
      );
    });
  };

  const getLocationWithRetry = async (retries = 2): Promise<Coords> => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        return await getLocation();
      } catch (err: any) {
        console.log(`getLocation error (intento ${attempt + 1}):`, err?.code);
        if (attempt === retries) throw err;
        await sleep(1500 * (attempt + 1));
        attempt++;
      }
    }
    throw new Error('No se pudo obtener ubicación tras varios intentos.');
  };

  // --- 2. La Tarea de Background (El "Corazón" que no muere) ---
  const veryIntensiveTask = async (taskDataArguments?: { delay: number }) => {
    const { delay } = taskDataArguments || { delay: intervalMs }; // Usar el intervalo que viene de props

    // Bucle infinito que mantiene vivo el servicio
    while (BackgroundService.isRunning()) {
      try {
        // A. Obtener Ubicación
        let coords: Coords;
        try {
          coords = await getLocationWithRetry();
        } catch (locErr) {
          console.log('⚠️ Fallo GPS en background, usando última conocida o default');
          coords = DEFAULT_COORDS;
        }

        // B. Preparar Payload
        const now = new Date().toISOString();
        const payload = {
          currentLocation: {
            latitude: coords.lat,
            longitude: coords.lng,
            updatedAt: now,
          },
        };

        // C. Enviar a tu API
        console.log('📡 Enviando ubicación (BG):', payload);
        await updateLocation(assignmentId, payload);

        // D. Actualizar Notificación (Vital para Android 14)
        await BackgroundService.updateNotification({
            taskDesc: `Último envío: ${now.split('T')[1].split('.')[0]}`,
        });

        // E. Callback al Front (si la app está abierta)
        if (onLocationUpdate) onLocationUpdate(`${coords.lat}, ${coords.lng}`);

      } catch (e: any) {
        console.log('⚠️ Error en ciclo background:', e?.message);
      }

      // F. Esperar X segundos antes de la siguiente vuelta
      await sleep(delay);
    }
  };

  // --- 3. Configuración del Servicio ---
  const options = {
    taskName: 'WorkTraceLocation',
    taskTitle: 'WorkTrace Activo',
    taskDesc: 'Rastreando ubicación en segundo plano',
    taskIcon: {
      name: 'ic_launcher', 
      type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'worktrace://', 
    parameters: {
      delay: intervalMs, // Pasamos tu intervalo aquí
    },
  };

  // --- 4. Funciones de Control ---
  const startBackgroundService = async () => {
    if (!BackgroundService.isRunning()) {
      try {
        console.log('🚀 Iniciando Servicio Background...');
        await BackgroundService.start(veryIntensiveTask, options);
      } catch (e) {
        console.log('Error al arrancar servicio:', e);
      }
    }
  };

  const stopTracking = async () => {
    if (BackgroundService.isRunning()) {
        console.log('🛑 Deteniendo Servicio Background...');
        await BackgroundService.stop();
    }
  };

  const sendCheckIn = async () => {
    try {
      console.log('📍 Iniciando Check-In...');
      let coords: Coords;
      try {
         coords = await getLocationWithRetry();
      } catch (e) {
         // Si falla, intentamos una vez más o fallamos
         console.log('Fallo GPS en Checkin');
         return; 
      }
      
      // Validación estricta para no mandar 0,0 en checkin
      if (!coords || (coords.lat === 0 && coords.lng === 0)) {
         console.log('Coordenadas inválidas para Check-in');
         return;
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

      await startAssignment(assignmentId, payload);
      setHasCheckedIn(true);
      if (onLocationUpdate) onLocationUpdate(`${coords.lat}, ${coords.lng}`);
      console.log('✅ Check-In Enviado');
    } catch (err: any) {
      console.log('❌ Error en Check-In:', err);
      Alert.alert('Error', 'No se pudo enviar el Check-In');
    }
  };

  // --- 5. Effect Principal (Auto-Arranque) ---
  useEffect(() => {
    if (!enabled) {
        // Si se deshabilita, matamos el servicio
        stopTracking();
        return;
    }

    const init = async () => {
      // A. Permisos
      if (askingPermissionRef.current) return;
      askingPermissionRef.current = true;
      const hasPermission = await requestLocationPermission();
      askingPermissionRef.current = false;
      
      if (!hasPermission) {
         Alert.alert('Permiso requerido', 'Debes permitir ubicación "Todo el tiempo"');
         return;
      }

      // B. Check-In (Solo si no se ha hecho)
      if (!hasCheckedIn) {
        await sendCheckIn();
      }

      // C. Arrancar el Loop Infinito
      startBackgroundService();
    };

    init();

    // Cleanup: Al salir de la pantalla, ¿paramos o seguimos?
    // Si quieres que siga al salir de la pantalla, BORRA la línea de abajo.
    // return () => { stopTracking(); }; 
  }, [enabled]);

  return { stopTracking };
};

export default useLocationTracking;