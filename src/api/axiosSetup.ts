import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../navigation/navigationRef';
import { login } from './auth';

export const setupAxios = () => {
  // Configurar interceptor de respuesta global
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        // Evitar bucle infinito si el fallo viene del propio login
        if (originalRequest.url && originalRequest.url.includes('/User/Login')) {
          return Promise.reject(error);
        }

        console.log('[Axios] 401 Detectado. Intentando Silent Login...');
        originalRequest._retry = true;

        try {
          const email = await AsyncStorage.getItem('userEmail');
          const password = await AsyncStorage.getItem('userPassword');

          if (email && password) {
             console.log('[Axios] Renovando token con credenciales guardadas...');
             // login() guarda el nuevo token en AsyncStorage
             await login(email, password); 
             
             // Recuperar el nuevo token para el header
             const newToken = await AsyncStorage.getItem('userToken');
             
             // Actualizar header y reintentar
             originalRequest.headers.Authorization = `Bearer ${newToken}`;
             return axios(originalRequest);
          } else {
             throw new Error('No hay credenciales para renovación automática.');
          }
        } catch (refreshError) {
          console.log('[Axios] Falló el Silent Login. Cerrando sesión...', refreshError);
          
          await AsyncStorage.multiRemove([
            'userToken', 
            'userId', 
            'userName', 
            'userRole',
            'userEmail',
            'userPassword'
          ]);

          navigate('Login');
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};
