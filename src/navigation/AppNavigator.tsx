import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TecnicoHomeScreen from '../screens/TecnicoHomeScreen';
import VendedorHomeScreen from '../screens/VendedorHomeScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="TecnicoHome" component={TecnicoHomeScreen} />
      <Stack.Screen name="VendedorHome" component={VendedorHomeScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
