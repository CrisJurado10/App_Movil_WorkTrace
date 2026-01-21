import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login } from '../api/auth';
import LinearGradient from 'react-native-linear-gradient';

import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    // 1. Validación Local: Campos vacíos
    if (!email.trim()) {
      Alert.alert('Campo requerido', 'Por favor, ingresa tu correo electrónico.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Campo requerido', 'Por favor, ingresa tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      
      // Guardar credenciales para Silent Login
      await AsyncStorage.setItem('userEmail', email);
      await AsyncStorage.setItem('userPassword', password);

      const userRole =
        user?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const userName =
        user?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];

      if (userRole === 'Técnico') {
        navigation.navigate('TecnicoHome', { userName });
      } else if (userRole === 'Vendedor') {
        navigation.navigate('VendedorHome', { userName });
      } else {
        Alert.alert(
          'Error de acceso',
          'No se pudo determinar el rol del usuario o el rol es inválido.',
        );
      }
    } catch (error: any) {
      // El mensaje de error ya viene traducido desde auth.ts -> errorHandler.ts
      Alert.alert('Error de acceso', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0052D4', '#4364F7', '#6FB1FC']}
        style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/login.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>TECNIC SOLUTION</Text>
          <Text style={styles.subtitle}>Expertos & Confiables</Text>
        </View>
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#A9A9A9"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#A9A9A9"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0052D4',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    color: '#333',
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;