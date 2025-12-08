import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useRoute,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../api/assignment';
import { startAssignment } from '../api/assignmentStart';
import Geolocation from '@react-native-community/geolocation';
import { requestLocationPermission } from '../utils/requestLocationPermission';
import { toLocalISOString } from '../utils/dateUtils';

const TecnicoHomeScreen = () => {
  const route = useRoute();
  const { userName } = route.params;
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ⬅️ PARA PULL TO REFRESH
  const [gpsReady, setGpsReady] = useState(false);
  const [checkingGps, setCheckingGps] = useState(false);
  const isCheckingGps = useRef(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);

  // Convertir Date → "dd-MM-yyyy"
  const formatDMY = date => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  // Saber si la tarea es hoy
  const isToday = dateStr => {
    return dateStr === formatDMY(new Date());
  };

  // Generar semana Domingo → Sábado
  const generateWeekDays = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Domingo

    const week = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(start);
      temp.setDate(start.getDate() + i);
      week.push(temp);
    }
    return week;
  };

  const weekDays = generateWeekDays();

  // Cargar tareas
  const loadAssignments = useCallback(async () => {
    setLoading(true);

    const userId = await AsyncStorage.getItem('userId');

    // Domingo → 00:00:00
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());

    // Sábado → 23:59:59
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    try {
      const data = await getAssignmentsByUser(
        userId,
        start.toISOString(),
        end.toISOString(),
      );
      setTasks(data);
    } catch (e) {
      console.log('ERROR:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- GPS Check Robust ---
  const checkGps = useCallback(async () => {
    if (gpsReady || isCheckingGps.current) return; // Ya tenemos GPS o estamos chequeando

    console.log('[GPS] Iniciando chequeo...');
    isCheckingGps.current = true;
    setCheckingGps(true);

    if (!Geolocation) {
        console.error('❌ Geolocation module is null! Check native linking.');
        Alert.alert('Error Crítico', 'El módulo de geolocalización no se cargó correctamente.');
        setCheckingGps(false);
        isCheckingGps.current = false;
        return;
    }
    
    try {
      let hasPermission = false;
      
      // 1. Explicit Permission Request
      if (Platform.OS === 'android') {
        console.log('[GPS] Solicitando permiso Android...');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        console.log('[GPS] Resultado permiso:', granted);
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        hasPermission = await requestLocationPermission();
      }

      if (!hasPermission) {
        console.log('[GPS] Permiso denegado');
        Alert.alert('Permiso denegado', 'Habilita el permiso de ubicación en ajustes.');
        setCheckingGps(false);
        isCheckingGps.current = false;
        return;
      }

      // 2. Fetch Position using @react-native-community/geolocation
      console.log('[GPS] Solicitando coordenadas con @react-native-community/geolocation...');
      Geolocation.getCurrentPosition(
        (pos) => {
          console.log('[GPS] Éxito:', pos.coords);
          console.log(`[GPS] Coordenadas recibidas: Lat ${pos.coords.latitude}, Lng ${pos.coords.longitude}`); // Log real coordinates
          if (pos.coords.latitude !== 0 || pos.coords.longitude !== 0) {
            setGpsReady(true);
            setCurrentLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); // Store real coords
          }
          setCheckingGps(false);
          isCheckingGps.current = false;
        },
        (err) => {
          console.log('[GPS] Error obteniendo posición:', err);
          Alert.alert('Error GPS', `No se pudo obtener ubicación: ${err.message}`);
          setCheckingGps(false);
          isCheckingGps.current = false;
        },
        { 
          enableHighAccuracy: false, 
          timeout: 30000, 
          maximumAge: 1000 
        }
      );
    } catch (e) {
      console.log('[GPS] Excepción en checkGps:', e);
      setCheckingGps(false);
      isCheckingGps.current = false;
    }
  }, [gpsReady]);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
      checkGps();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    checkGps(); // Reintentar GPS al hacer pull
    await loadAssignments();
    setRefreshing(false);
  };

  const handleCheckIn = async (item) => {
    // Basic check if GPS permission/module is ready, although we will force a fresh read.
    // We can keep checking gpsReady to ensure the initial setup passed.
    if (!gpsReady) {
      console.log('[GPS] GPS not ready yet.');
      Alert.alert('GPS no listo', 'Espera a que el GPS esté listo.');
      return;
    }

    try {
      // FORCE FRESH GPS READ
      const getFreshLocation = () => {
        return new Promise<any>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 } // Force fresh
          );
        });
      };

      console.log('[handleCheckIn] Obteniendo ubicación fresca...');
      const freshCoords = await getFreshLocation();
      console.log('[handleCheckIn] Ubicación fresca:', freshCoords.latitude, freshCoords.longitude);

      const now = toLocalISOString(new Date());
      // Si ya tiene checkIn, usarlo. Si no, usar ahora.
      const checkInDate = item.checkIn ? item.checkIn : now;

      const payload = {
        checkIn: checkInDate,
        currentLocation: {
          latitude: freshCoords.latitude,
          longitude: freshCoords.longitude,
          UpdatedAt: new Date().toISOString(), // PascalCase y UTC
        },
      };

      // Llamar SIEMPRE a la API para actualizar ubicación (aunque ya esté iniciada)
      await startAssignment(item.id, payload);
      console.log('Check-In/Update registrado con éxito.');

      navigation.navigate('StartAssignmentScreen', {
        assignmentId: item.id,
        latitude: freshCoords.latitude,
        longitude: freshCoords.longitude,
        checkIn: checkInDate,
      });
      
      // Actualizar lista
      loadAssignments();

    } catch (error) {
      console.error('Error al hacer Check-In:', error);
      Alert.alert('Error', 'No se pudo obtener ubicación o iniciar tarea.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.name}>{userName}</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Calendario semanal</Text>

          {weekDays.map((day, index) => {
            const formatted = formatDMY(day);

            const dayTasks = tasks.filter(t => t.assignedDate === formatted);

            return (
              <View key={index} style={styles.dayBlock}>
                <Text style={styles.dayLabel}>
                  {day
                    .toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'short',
                    })
                    .toUpperCase()}
                </Text>

                {dayTasks.length === 0 ? (
                  <Text style={styles.noTask}>No hay tareas</Text>
                ) : (
                  dayTasks.map(item => {
                    const enabled = isToday(item.assignedDate);

                    return (
                      <View key={item.id} style={styles.card}>
                        <Text style={styles.client}>{item.client}</Text>

                        <Text style={styles.field}>
                          Servicio: {item.service}
                        </Text>
                        <Text style={styles.field}>
                          Dirección: {item.address}
                        </Text>
                        <Text style={styles.field}>
                          Hora: {item.assignedTime}
                        </Text>

                        {/* NUEVOS CAMPOS */}
                        <Text style={styles.field}>Estado: {item.status}</Text>
                        <Text style={styles.field}>
                          Agendado por: {item.createdByUser}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.startButton,
                            ((!enabled && !item.checkIn) || (!gpsReady && checkingGps)) && styles.disabledButton,
                            (!gpsReady && !checkingGps && enabled && !item.checkIn) && styles.retryButton,
                            !!item.checkIn && styles.inProgressButton,
                          ]}
                          disabled={(!enabled && !item.checkIn) || (!gpsReady && checkingGps)}
                          onPress={() => {
                            if (!enabled && !item.checkIn) return;
                            handleCheckIn(item);
                          }}
                        >
                          {(enabled || item.checkIn) && !gpsReady && checkingGps ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.buttonText}>
                              {item.checkIn
                                ? 'Servicio en Progreso'
                                : enabled
                                ? (gpsReady ? 'Iniciar' : 'Reintentar GPS')
                                : 'No disponible'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
    
  </SafeAreaView>
  );
};

// 🎨 ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#4B5563',
  },
  name: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  dayBlock: {
    marginTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10,
  },
  noTask: {
    fontSize: 16,
    color: '#6B7280',
    paddingHorizontal: 5,
  },
  card: {
    backgroundColor: 'white',
    marginVertical: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  client: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 6,
  },
  field: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  startButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  retryButton: {
    backgroundColor: '#F59E0B', // Amber/Orange warning color
  },
  inProgressButton: {
    backgroundColor: '#F97316', // Orange
  },
  buttonText: {
    fontSize: 15,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TecnicoHomeScreen;
