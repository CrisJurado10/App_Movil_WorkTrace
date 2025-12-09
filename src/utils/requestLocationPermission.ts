import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      // Step 1: Request Foreground Permission (Fine Location)
      const fineGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de ubicación',
          message: 'WorkTrace necesita acceso a tu ubicación precisa para el rastreo.',
          buttonNeutral: 'Preguntar luego',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Aceptar',
        }
      );

      if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Foreground permission denied');
        return false;
      }

      // Step 1.5: Request Notification Permission (Android 13+ / API 33+)
      // We do this to ensure the foreground service notification can be shown, 
      // but we do NOT block the service start if denied, as tracking can technically 
      // persist in the background (though the OS might demote it).
      if (Platform.Version >= 33) {
        try {
          const notificationGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Permiso de Notificación',
              message: 'WorkTrace necesita mostrar una notificación persistente para mantener el rastreo activo.',
              buttonNeutral: 'Preguntar luego',
              buttonNegative: 'Cancelar',
              buttonPositive: 'Aceptar',
            }
          );
          if (notificationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('POST_NOTIFICATIONS denied. Service will run without visible notification.');
          }
        } catch (notifErr) {
          console.warn('Error requesting notification permission:', notifErr);
        }
      }

      // Step 2: Request Background Permission (Android 10+)
      if (Platform.Version >= 29) {
        const backgroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Permiso de ubicación en segundo plano',
            message: 'Para rastrear tu ruta mientras la app está cerrada, selecciona "Permitir todo el tiempo" en la siguiente pantalla.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Ir a Configuración',
          }
        );

        if (backgroundGranted === PermissionsAndroid.RESULTS.GRANTED) {
           return true;
        } else {
           // Handle manual redirection for Android 11+ (API 30+) where simple request might fail or require user action
           Alert.alert(
             'Permiso en segundo plano requerido',
             'Para que el rastreo funcione con la pantalla apagada, debes seleccionar "Permitir todo el tiempo" en la configuración de ubicación.',
             [
               { text: 'Cancelar', style: 'cancel' },
               { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
             ]
           );
           return false;
        }
      }

      return true;

    } else {
      // iOS
      const status = await Geolocation.requestAuthorization('always');
      return status === 'granted';
    }
  } catch (err) {
    console.warn('Error solicitando permiso:', err);
    return false;
  }
};