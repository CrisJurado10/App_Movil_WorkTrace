
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de ubicación',
          message: 'Necesitamos tu ubicación para iniciar la tarea y enviar actualizaciones.',
          buttonNeutral: 'Preguntar luego',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Aceptar',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    }
  } catch (err) {
    console.warn('Error solicitando permiso:', err);
    return false;
  }
};
