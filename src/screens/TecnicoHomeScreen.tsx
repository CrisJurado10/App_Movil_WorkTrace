import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';

const TecnicoHomeScreen = () => {
  const route = useRoute();
  const { userName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido,</Text>
      <Text style={styles.name}>{userName}</Text>
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

export default TecnicoHomeScreen;
