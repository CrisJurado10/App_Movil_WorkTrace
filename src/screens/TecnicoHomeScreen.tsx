import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
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
  AppState,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useRoute,
  useFocusEffect,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../api/assignment';
import { startAssignment } from '../api/assignmentStart';
import Geolocation from 'react-native-geolocation-service';
import { requestLocationPermission } from '../utils/requestLocationPermission';
import { toLocalISOString } from '../utils/dateUtils';
import { startBackgroundLocationService } from '../services/BackgroundLocationService';

const TecnicoHomeScreen = () => {
  // 1. HOOKS
  const route = useRoute();
  const navigation = useNavigation<any>();
  const [displayName, setDisplayName] = useState(route.params?.userName || '');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [checkingGps, setCheckingGps] = useState(false);
  const [isLocationBlocked, setIsLocationBlocked] = useState(false);
  const [isGpsHardwareOff, setIsGpsHardwareOff] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);

  const isCheckingGps = useRef(false);
  const appState = useRef(AppState.currentState);

  // 2. HELPER FUNCTIONS (Non-hooks)
  const formatDMY = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const isToday = (dateStr: string) => {
    return dateStr === formatDMY(new Date());
  };

  const generateWeekDays = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const week = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(start);
      temp.setDate(start.getDate() + i);
      week.push(temp);
    }
    return week;
  };

  // 3. MORE HOOKS (Callbacks, Effects)
  const weekDays = generateWeekDays();

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        console.log('Debug: No userId found');
        return;
      }
      const today = new Date();
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const data = await getAssignmentsByUser(
        userId,
        start.toISOString(),
        end.toISOString(),
      );
      console.log('Debug Tasks:', data);
      // Read locally finished assignments and mark them
      try {
        const raw = await AsyncStorage.getItem('finishedAssignments');
        const finished = raw ? JSON.parse(raw) : [];
        const augmented = data.map((d: any) => ({ ...d, _locallyFinished: finished.includes(String(d.id)) }));
        setTasks(augmented);
        return augmented;
      } catch (e) {
        setTasks(data);
        return data;
      }
    } catch (e) {
      console.log('ERROR:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkLocationStatus = useCallback(async () => {
    console.log("Checking GPS State:", checkingGps);
    if (isCheckingGps.current) return;
    const isSilentCheck = gpsReady;

    try {
      isCheckingGps.current = true;
      if (!isSilentCheck) setCheckingGps(true);
      setIsGpsHardwareOff(false); // Reset hardware flag

      console.log('[LocationGate] Verifying permissions...');
      let hasPermission = false;
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        hasPermission = granted;
        if (!granted) {
             const request = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            hasPermission = request === PermissionsAndroid.RESULTS.GRANTED;
        }
      } else {
        hasPermission = await requestLocationPermission();
      }

      if (!hasPermission) {
        console.log('[LocationGate] Permission denied.');
        setIsLocationBlocked(true);
        setGpsReady(false);
      } else {
        console.log('[LocationGate] Permission granted. Enabling GPS ready state.');
        setGpsReady(true);
        setIsLocationBlocked(false);
      }

    } catch (error) {
      console.log('[LocationGate] Caught error -> Blocking UI.', error);
      setIsLocationBlocked(true);
      setGpsReady(false);
    } finally {
        if (!isSilentCheck) setCheckingGps(false);
        isCheckingGps.current = false;
    }
  }, [gpsReady, checkingGps]);

  // Effect: Start Service & Load User Name
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        // 1. Load Assignments first
            console.log('[HomeScreen] Loading assignments...');
            const data = await loadAssignments();

            // 2. Init Background Service ONLY if there are active assignments and permissions
            // Exclude locally finished assignments from active check
            const active = data && data.some((a: any) => {
              if (a._locallyFinished) return false;
              return a.status === 'In Progress' || a.status === 'Started' || (a.checkIn && a.status !== 'Completed');
            });

        if (Platform.OS === 'android') {
          console.log('[InitService] Requesting permissions...');
          const permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
          // Add POST_NOTIFICATIONS for Android 13+ (API 33+)
          if (Platform.Version >= 33) {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }

          const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
          console.log('[InitService] Permissions result:', granted);

          const locationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          const notificationsGranted = Platform.Version >= 33 
            ? granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED
            : true;

          if (locationGranted && active) {
            if (!notificationsGranted) {
              console.warn('[InitService] POST_NOTIFICATIONS denied. Service will run without notifications.');
            }
            try {
              console.log('[InitService] Starting background service...');
              await startBackgroundLocationService();
            } catch (serviceErr) {
              console.error('[InitService] Failed to start service:', serviceErr);
            }
          } else {
            console.log('[InitService] Location Permission not granted or no active assignments. Service will not start.');
          }
        } else {
          // iOS or other platforms handling: start only if active assignments
          if (active) {
            try {
              await startBackgroundLocationService();
            } catch (iosServiceErr) {
              console.error('[InitService] Failed to start service (iOS/other):', iosServiceErr);
            }
          }
        }

        
        // 3. Load Name
        if (!displayName) {
          const storedName = await AsyncStorage.getItem('userName');
          if (storedName) setDisplayName(storedName);
        }
      } catch (err) {
        console.error('[InitService] Error during initialization:', err);
      }

        // 3. Load Name
        if (!displayName) {
            const storedName = await AsyncStorage.getItem('userName');
            if (storedName) setDisplayName(storedName);
        }

        // 4. Battery Optimization Check (Android)
        if (Platform.OS === 'android') {
            const hasAsked = await AsyncStorage.getItem('hasAskedBatteryOpt');
            if (!hasAsked) {
                Alert.alert(
                    "Optimización de Batería",
                    "Para garantizar que el GPS funcione en segundo plano, WorkTrace necesita ser excluida de la optimización de batería. Por favor selecciona 'Permitir' o 'Sin restricciones' en la siguiente pantalla.",
                    [
                        { text: "Cancelar", style: "cancel" },
                        { 
                            text: "Abrir Configuración", 
                            onPress: async () => {
                                await AsyncStorage.setItem('hasAskedBatteryOpt', 'true');
                                try {
                                    // Opens the list of apps to ignore battery optimizations
                                    await Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
                                } catch (e) {
                                    console.error("Failed to open battery settings:", e);
                                    Linking.openSettings();
                                }
                            } 
                        }
                    ]
                );
            }
        }
    };

    initAndLoad();
  }, [displayName, loadAssignments]);

  // Effect: AppState Monitor
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AppState] App has come to the foreground! Re-checking location.');
        checkLocationStatus();
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [checkLocationStatus]);

  // Effect: Focus (Load data)
  useFocusEffect(
    useCallback(() => {
      loadAssignments();
      checkLocationStatus();
    }, [checkLocationStatus, loadAssignments]),
  );

  // Layout Effect: Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Salir</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // 4. HANDLERS
  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
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
            } catch (e) {
              console.error('Error al cerrar sesión', e);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkLocationStatus();
    await loadAssignments();
    setRefreshing(false);
  };

  const handleCheckIn = async (item: any) => {
    try {
      const getFreshLocation = () => {
        return new Promise<any>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000, forceRequestLocation: true, showLocationDialog: true }
          );
        });
      };
      const freshCoords = await getFreshLocation();
      const now = toLocalISOString(new Date());
      const checkInDate = item.checkIn ? item.checkIn : now;
      const payload = {
        checkIn: checkInDate,
        currentLocation: {
          latitude: freshCoords.latitude,
          longitude: freshCoords.longitude,
          UpdatedAt: new Date().toISOString(),
        },
      };
      await startAssignment(item.id, payload);
      navigation.navigate('StartAssignmentScreen', {
        assignmentId: item.id,
        latitude: freshCoords.latitude,
        longitude: freshCoords.longitude,
        checkIn: checkInDate,
      });
      loadAssignments();
    } catch (error: any) {
      console.error('Error al hacer Check-In:', error);
      if (error?.code === 3) {
          Alert.alert('Error de Conexión GPS', 'No se pudo obtener la ubicación. Por favor, verifica que el GPS esté activo y tengas buena señal.');
      } else {
          Alert.alert('Error', 'No se pudo obtener ubicación o iniciar tarea.');
      }
    }
  };

  // 5. CONDITIONAL RENDER (MUST BE LAST)
  if (isLocationBlocked) {
      return (
          <SafeAreaView style={[styles.container, styles.centerContent]}>
              <Text style={styles.blockTitle}>Ubicación Requerida</Text>
              <Text style={styles.blockText}>
                  {isGpsHardwareOff 
                    ? 'El GPS está desactivado. Por favor, actívalo para continuar.' 
                    : 'Para utilizar esta aplicación, es necesario que otorgues los permisos de ubicación.'}
              </Text>
              <TouchableOpacity
                  style={styles.fixButton}
                  onPress={() => {
                    if (isGpsHardwareOff && Platform.OS === 'android') {
                        Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
                    } else {
                        Linking.openSettings();
                    }
                  }}
              >
                  <Text style={styles.fixButtonText}>
                    {isGpsHardwareOff ? 'Activar GPS' : 'Ir a Configuración'}
                  </Text>
              </TouchableOpacity>
              <TouchableOpacity
                  style={styles.retryLink}
                  onPress={checkLocationStatus}
              >
                  <Text style={styles.retryLinkText}>Reintentar</Text>
              </TouchableOpacity>
          </SafeAreaView>
      );
  }

  // 6. MAIN RENDER
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.name}>{displayName}</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Calendario semanal</Text>

          {weekDays.map((day, index) => {
            const formatted = formatDMY(day);
            const dayTasks = tasks.filter((t: any) => t.assignedDate === formatted);

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
                  dayTasks.map((item: any) => {
                    const enabled = isToday(item.assignedDate);
                    const localFinished = !!item._locallyFinished;
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
                        <Text style={styles.field}>Estado: {item.status}</Text>
                        <Text style={styles.field}>
                          Agendado por: {item.createdByUser}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.startButton,
                            (!enabled && !item.checkIn) && styles.disabledButton,
                            !!item.checkIn && styles.inProgressButton,
                            localFinished && styles.finishedButton,
                          ]}
                          disabled={localFinished || (!enabled && !item.checkIn)}
                          onPress={() => {
                            if (localFinished) return;
                            if (!enabled && !item.checkIn) return;
                            handleCheckIn(item);
                          }}
                        >
                          <Text style={styles.buttonText}>
                              {localFinished
                                ? 'Finalizado'
                                : item.checkIn
                                ? 'Servicio en Progreso'
                                : enabled
                                ? 'Iniciar'
                                : 'No disponible'}
                            </Text>
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
  centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  blockTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#EF4444',
      marginBottom: 10,
      textAlign: 'center',
  },
  blockText: {
      fontSize: 16,
      color: '#374151',
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20,
  },
  fixButton: {
      backgroundColor: '#2563EB',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginBottom: 15,
  },
  fixButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
  },
  retryLink: {
      padding: 10,
  },
  retryLinkText: {
      color: '#2563EB',
      textDecorationLine: 'underline',
      fontSize: 16,
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
  finishedButton: {
    backgroundColor: '#10B981', // green to indicate finished
  },
  buttonText: {
    fontSize: 15,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TecnicoHomeScreen;