import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const login = async (email, password) => {
  try {
    const response = await axios.post('http://10.0.2.2:5284/User/Login', {
      email,
      password,
    });

    const { token } = response.data;
    await AsyncStorage.setItem('userToken', token);
    
    const decodedToken = jwtDecode(token);
    return decodedToken;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error('Ocurrió un error desconocido durante el inicio de sesión.');
  }
};