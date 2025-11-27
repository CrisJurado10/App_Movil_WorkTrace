
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import useLocationTracking from '../hooks/useLocationTracking';

const StartAssignmentScreen = ({ route }) => {
  const { assignmentId } = route.params; // Extract only assignmentId
  const [loading, setLoading] = useState(true);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [lastCoords, setLastCoords] = useState<string>('');

  useLocationTracking({
    assignmentId,
    enabled: true,
    intervalMs: 30000,
    onLocationUpdate: (coords) => setLastCoords(coords),
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    const now = new Date().toLocaleString();
    setCheckInTime(now);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <>
          <Text style={styles.title}>Tarea iniciada</Text>
          <Text style={styles.subText}>Check-In realizado a las:</Text>
          <Text style={styles.time}>{checkInTime}</Text>
          <Text style={styles.subText}>Ubicación enviada cada 30 segundos</Text>
          {lastCoords && <Text style={styles.coords}>Última ubicación: {lastCoords}</Text>}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subText: { fontSize: 16, marginTop: 10 },
  time: { fontSize: 20, fontWeight: 'bold', color: '#2563EB', marginTop: 5 },
  coords: { fontSize: 14, color: '#555', marginTop: 10 },
});

export default StartAssignmentScreen;
