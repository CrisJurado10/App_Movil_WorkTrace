import React, { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FormInput from '../components/FormInput';
import {
  createTakenRequirement,
  searchClientByDoc,
  ClientInformationResponse,
} from '../api/takenRequirement';
import { VALIDATION_RULES } from '../constants/validationRules';

interface Props {
  navigation: any;
}

const TakenRequirementCreateScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<any>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [selectedClient, setSelectedClient] =
    useState<ClientInformationResponse | null>(null);
  const [searchError, setSearchError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  /* =======================
     RECIBIR DATOS AL VOLVER
     ======================= */
  useEffect(() => {
    if (route.params?.selectedClient) {
      setSelectedClient(route.params.selectedClient);
      setDocNumber('');
    }

    if (route.params?.draft) {
      setTitle(route.params.draft.title);
      setDescription(route.params.draft.description);
    }
  }, [route.params]);

  /* =======================
     VALIDACIÓN
     ======================= */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const rules = VALIDATION_RULES.TakenRequirement;

    if (!title.trim()) {
      errors.title = `${rules.Title.label} es obligatorio`;
    } else if (title.length > rules.Title.maxLength) {
      errors.title = `${rules.Title.label} no puede exceder ${rules.Title.maxLength} caracteres`;
    }

    if (!description.trim()) {
      errors.description = `${rules.Description.label} es obligatoria`;
    } else if (description.length > rules.Description.maxLength) {
      errors.description = `${rules.Description.label} no puede exceder ${rules.Description.maxLength} caracteres`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* =======================
     BUSCAR CLIENTE
     ======================= */
  const handleSearchClient = async () => {
    const trimmedDoc = docNumber.trim();

    if (!trimmedDoc) {
      setSearchError('Ingresa un número de documento');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const client = await searchClientByDoc(trimmedDoc);
      setSelectedClient(client);
      setDocNumber('');
    } catch (error: any) {
      setSearchError(error.message || 'Cliente no encontrado');
    } finally {
      setSearching(false);
    }
  };

  /* =======================
     CREAR CLIENTE
     ======================= */
  const handleCreateNewClient = () => {
    if (!docNumber.trim()) {
      setSearchError('Ingresa un número de documento');
      return;
    }

    navigation.navigate('ClientCreate', {
      documentNumber: docNumber.trim(),
      draft: {
        title,
        description,
      },
    });
  };

  /* =======================
     QUITAR CLIENTE
     ======================= */
  const handleRemoveClient = () => {
    Alert.alert('Confirmar', '¿Deseas quitar el cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => setSelectedClient(null),
      },
    ]);
  };

  /* =======================
     GUARDAR
     ======================= */
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('Usuario no encontrado');

      await createTakenRequirement({
        userId,
        clientId: selectedClient?.id || null,
        title: title.trim(),
        description: description.trim(),
      });

      Alert.alert('Éxito', 'Requerimiento creado correctamente', [
        { text: 'OK', onPress: () => navigation.navigate('VendedorHome') },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo crear el requerimiento',
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     RENDER
     ======================= */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Requerimiento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <FormInput
          label="Título"
          value={title}
          onChangeText={setTitle}
          error={formErrors.title}
          required
          maxLength={VALIDATION_RULES.TakenRequirement.Title.maxLength}
        />

        <FormInput
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          multiline
          error={formErrors.description}
          required
          maxLength={VALIDATION_RULES.TakenRequirement.Description.maxLength}
        />

        <Text style={styles.sectionTitle}>Cliente (Opcional)</Text>

        {selectedClient ? (
          <View style={styles.clientCard}>
            <Text style={styles.clientName}>{selectedClient.fullName}</Text>
            <TouchableOpacity onPress={handleRemoveClient}>
              <Text style={styles.changeText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FormInput
              label="Número de Documento"
              value={docNumber}
              onChangeText={setDocNumber}
              keyboardType="phone-pad"
              maxLength={VALIDATION_RULES.Client.DocumentNumber.maxLength}
            />

            {searchError && <Text style={styles.error}>{searchError}</Text>}

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearchClient}
              >
                {searching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Buscar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateNewClient}
              >
                <Text style={styles.buttonText}>Crear Cliente</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TakenRequirementCreateScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontWeight: '700' },
  headerButton: { color: '#fff' },
  contentContainer: { padding: 16 },
  sectionTitle: { marginTop: 16, fontWeight: '700' },
  clientCard: { backgroundColor: '#e8f4f8', padding: 12, borderRadius: 8 },
  clientName: { fontWeight: '700' },
  changeText: { color: '#007AFF', marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  searchButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  footer: { padding: 16 },
  saveButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8 },
  saveText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  error: { color: 'red', fontSize: 12 },
});
