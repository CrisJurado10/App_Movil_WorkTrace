import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VendedorHomeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState(route.params?.userName || '');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Cerrar Sesión',
              '¿Estás seguro de que deseas salir?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Salir',
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.multiRemove([
                      'userToken',
                      'userEmail',
                      'userPassword',
                      'userId',
                      'userRole',
                      'userName'
                    ]);
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      })
                    );
                  },
                },
              ]
            );
          }} 
          style={{ marginRight: 15 }}
        >
          <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Salir</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const loadName = async () => {
      if (!displayName) {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) setDisplayName(storedName);
      }
    };
    loadName();
  }, [displayName]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido,</Text>
      <Text style={styles.name}>{displayName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#666',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
});

export default VendedorHomeScreen;
