import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (email: string, password: string): Promise<any> => {
  try {
    const response = await axios.post(
      'http://192.168.100.229:5284/User/Login',
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
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error('Ocurrió un error desconocido durante el inicio de sesión.');
  }
};