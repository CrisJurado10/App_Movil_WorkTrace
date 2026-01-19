import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { getTakenRequirementsByUserAndDateRange } from '../api/takenRequirement';

interface Props {
  navigation: any;
}

const VendedorHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [groupedRequirements, setGroupedRequirements] = useState<
    { label: string; data: any[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =======================
     LOGOUT
     ======================= */
  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
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
              'userName',
            ]);

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              }),
            );
          } catch (e) {
            console.error('Error al cerrar sesión', e);
          }
        },
      },
    ]);
  };

  /* =======================
     LOAD DATA
     ======================= */
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const getDayRangeUTC = (offsetDays: number) => {
        const start = new Date();
        start.setDate(start.getDate() - offsetDays);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        return {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      };

      const todayRange = getDayRangeUTC(0);
      const oneDaysRange = getDayRangeUTC(1);
      const twoDaysRange = getDayRangeUTC(2);

      const [todayRaw, oneDaysRaw, twoDaysRaw] = await Promise.all([
        getTakenRequirementsByUserAndDateRange(
          userId,
          todayRange.start,
          todayRange.end,
        ).catch(() => []),
        getTakenRequirementsByUserAndDateRange(
          userId,
          oneDaysRange.start,
          oneDaysRange.end,
        ).catch(() => []),
        getTakenRequirementsByUserAndDateRange(
          userId,
          twoDaysRange.start,
          twoDaysRange.end,
        ).catch(() => []),
      ]);

      const normalize = (data: any) =>
        Array.isArray(data) ? data : data ? [data] : [];

      const todayItems = normalize(todayRaw);
      const oneDaysItems = normalize(oneDaysRaw);
      const twoDaysItems = normalize(twoDaysRaw);

      const groups: { label: string; data: any[] }[] = [];

      if (todayItems.length > 0) {
        groups.push({ label: 'Hoy', data: todayItems });
      }
      if (oneDaysItems.length > 0) {
        groups.push({ label: 'Hace 1 día', data: oneDaysItems });
      }
      if (twoDaysItems.length > 0) {
        groups.push({ label: 'Hace 2 días', data: twoDaysItems });
      }

      setGroupedRequirements(groups);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los requerimientos');
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     PULL TO REFRESH
     ======================= */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* =======================
     ACTIONS
     ======================= */
  const handleEditRequirement = (requirement: any) => {
    navigation.push('TakenRequirementEdit', {
      requirementToEdit: requirement,
    });
  };

  const handleCreateNew = () => {
    InteractionManager.runAfterInteractions(() => {
      navigation.push('TakenRequirementCreate');
    });
  };

  /* =======================
     RENDER ITEM
     ======================= */
  const renderRequirement = (item: any) => (
    <View style={styles.requirementCard}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={styles.cardDate}>
        {new Date(item.date).toLocaleString()}
      </Text>

      {item.client && (
        <View style={styles.clientSection}>
          <Text style={styles.clientName}>Cliente: {item.client.fullName}</Text>
          <Text style={styles.clientInfo}>Correo: {item.client.email}</Text>
          <Text style={styles.clientInfo}>
            Documento: {item.client.documentNumber}
          </Text>
          <Text style={styles.clientInfo}>
            Teléfono: {item.client.phoneNumber}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEditRequirement(item)}
      >
        <Text style={styles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );

  /* =======================
     LOADING
     ======================= */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* =======================
     UI
     ======================= */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Requerimientos</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedRequirements}
        keyExtractor={item => item.label}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <View style={styles.groupContainer}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupLabel}>{item.label}</Text>
            </View>
            {item.data.map((req: any) => (
              <View key={req.id}>{renderRequirement(req)}</View>
            ))}
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

/* =======================
   STYLES (SIN CAMBIOS)
   ======================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoutText: { color: '#fff', fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  groupContainer: { marginTop: 20 },
  groupHeader: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0ecff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  groupLabel: { fontSize: 13, fontWeight: '700', color: '#007AFF' },

  requirementCard: {
    backgroundColor: '#d3f8be',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardDescription: { fontSize: 13, color: '#666', marginTop: 6 },
  cardDate: { fontSize: 12, color: '#999', marginTop: 6 },

  clientSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e4eaf0',
    borderRadius: 6,
  },
  clientName: { fontSize: 14, fontWeight: '600' },
  clientInfo: { fontSize: 12, color: '#555' },

  editButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#035096',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: { color: '#fff', fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#035afc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: { fontSize: 28, color: '#fff' },
});

export default VendedorHomeScreen;
