import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../utils/errorHandler';

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
    // Usar el manejador centralizado para lanzar un mensaje limpio
    const msg = getErrorMessage(error);
    throw new Error(msg);
  }
};