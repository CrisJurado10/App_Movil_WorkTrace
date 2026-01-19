import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (email: string, password: string): Promise<any> => {
  try {
    const response = await axios.post(
      'https://worktraceapi.onrender.com/User/Login',
      {
        email,
        password,
      }
    );

    const { token } = response.data;

    // Guardar el token
    await AsyncStorage.setItem('userToken', token);

    // Decodificar JWT
    const decodedToken: any = jwtDecode(token);

    // Extraer userId (claim NameIdentifier)
    const userId =
      decodedToken[
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
      ];

    // Extraer nombre
    const userName =
      decodedToken[
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
      ];

    // Extraer rol
    const userRole =
      decodedToken[
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      ];

    // Guardar datos importantes
    await AsyncStorage.setItem('userId', userId);
    await AsyncStorage.setItem('userName', userName);
    await AsyncStorage.setItem('userRole', userRole);

    return decodedToken;
  } catch (error: any) {
    console.error('[Auth] login error:', error);
    // Si el servidor responde con un body, devolver su mensaje cuando exista
    if (error.response && error.response.data) {
      const serverMsg =
        error.response.data.error || error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(serverMsg);
    }

    // Si la petición se envió pero no hubo respuesta
    if (error.request) {
      throw new Error(
        'No hay respuesta del servidor. Verifica que la API sea accesible desde el dispositivo y que el certificado SSL sea válido (self-signed puede fallar en Android).'
      );
    }

    // Otros errores (p. ej. configuración, network, etc.)
    throw new Error(error.message || 'Ocurrió un error desconocido durante el inicio de sesión.');
  }
};