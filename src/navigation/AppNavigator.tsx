import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TecnicoHomeScreen from '../screens/TecnicoHomeScreen';
import VendedorHomeScreen from '../screens/VendedorHomeScreen';
import StartAssignmentScreen from '../screens/StartAssignmentScreen'; // <-- IMPORTANTE

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      
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
