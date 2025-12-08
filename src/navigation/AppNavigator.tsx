import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TecnicoHomeScreen from '../screens/TecnicoHomeScreen';
import VendedorHomeScreen from '../screens/VendedorHomeScreen';
import StartAssignmentScreen from '../screens/StartAssignmentScreen'; // <-- IMPORTANTE

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');

        if (userToken && userRole) {
          if (userRole === 'Técnico') {
            setInitialRoute('TecnicoHome');
          } else if (userRole === 'Vendedor') {
            setInitialRoute('VendedorHome');
          }
        }
      } catch (e) {
        console.error('Error checking auth state', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute}>
      
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Home"
        component={HomeScreen}
      />

      <Stack.Screen
        name="TecnicoHome"
        component={TecnicoHomeScreen}
      />

      <Stack.Screen
        name="VendedorHome"
        component={VendedorHomeScreen}
      />

      {/* 👇 ESTA ES LA QUE FALTABA */}
      <Stack.Screen 
        name="StartAssignmentScreen"
        component={StartAssignmentScreen}
        options={{ title: "Iniciar Asignación" }}
      />

    </Stack.Navigator>
  );
};

export default AppNavigator;
