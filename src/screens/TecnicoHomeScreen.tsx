import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  useRoute,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../api/assignment';

const TecnicoHomeScreen = () => {
  const route = useRoute();
  const { userName } = route.params;
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ⬅️ PARA PULL TO REFRESH

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
  const loadAssignments = async () => {
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
  };

  // 🟦 Primera carga
  useEffect(() => {
    loadAssignments();
  }, []);

  // 🟦 Recargar al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, []),
  );

  // 🟦 Pull to Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const handleStart = id => {
    console.log('Iniciar tarea:', id);
  };

  return (
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
                            !enabled && styles.disabledButton,
                          ]}
                          disabled={!enabled}
                          onPress={() =>
                            navigation.navigate('StartAssignmentScreen', {
                              assignmentId: item.id,
                            })
                          }
                        >
                          <Text style={styles.buttonText}>
                            {enabled ? 'Iniciar' : 'No disponible'}
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
  buttonText: {
    fontSize: 15,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TecnicoHomeScreen;
