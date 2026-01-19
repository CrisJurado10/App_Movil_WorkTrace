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
import FormInput from '../components/FormInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  updateTakenRequirement,
  searchClientByDoc,
  ClientInformationResponse,
  TakenRequirementWithClientResponse,
} from '../api/takenRequirement';
import { VALIDATION_RULES } from '../constants/validationRules';

interface Props {
  navigation: any;
}

const TakenRequirementEditScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<any>();

  /* =======================
     REQUIREMENT (DEFENSIVO)
     ======================= */
  const requirement: TakenRequirementWithClientResponse | undefined =
    route.params?.requirementToEdit;

  if (!requirement) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error: requerimiento no encontrado
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================
     STATE
     ======================= */
  const [title, setTitle] = useState(requirement.title);
  const [description, setDescription] = useState(requirement.description);
  const [selectedClient, setSelectedClient] =
    useState<ClientInformationResponse | null>(requirement.client ?? null);
  const [docNumber, setDocNumber] = useState('');
  const [searchError, setSearchError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  /* =======================
     RECIBIR CLIENTE NUEVO
     ======================= */
  useEffect(() => {
    if (route.params?.selectedClient) {
      setSelectedClient(route.params.selectedClient);
    }
  }, [route.params?.selectedClient]);

  /* =======================
     VALIDACIÓN
     ======================= */
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const rules = VALIDATION_RULES.TakenRequirement;

    if (!title.trim()) {
      errors.title = `${rules.Title.label} es obligatorio`;
    }

    if (!description.trim()) {
      errors.description = `${rules.Description.label} es obligatoria`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* =======================
     BUSCAR CLIENTE
     ======================= */
  const handleSearchClient = async () => {
    const trimmedDoc = docNumber.trim();
    const rules = VALIDATION_RULES.Client.DocumentNumber;

    if (!trimmedDoc) {
      setSearchError(`${rules.label} es obligatorio`);
      return;
    }

    if (trimmedDoc.length < rules.minLength) {
      setSearchError(
        `${rules.label} debe tener al menos ${rules.minLength} caracteres`,
      );
      return;
    }

    if (trimmedDoc.length > rules.maxLength) {
      setSearchError(
        `${rules.label} no puede exceder ${rules.maxLength} caracteres`,
      );
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
     CREAR CLIENTE NUEVO
     ======================= */
  const handleCreateNewClient = () => {
    navigation.navigate('ClientCreate', {
      documentNumber: docNumber.trim(),
      origin: 'edit',
      requirementToEdit: requirement,
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
     GUARDAR CAMBIOS
     ======================= */
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await updateTakenRequirement({
        id: requirement.id,
        title: title.trim(),
        description: description.trim(),
        clientId: selectedClient ? selectedClient.id : null,
      });

      Alert.alert('Éxito', 'Requerimiento actualizado', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('VendedorHome'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar');
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
        <Text style={styles.headerTitle}>Editar Requerimiento</Text>
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
            <Text style={styles.clientName}>
              Nombre: {selectedClient.fullName}
            </Text>
            <Text style={styles.clientDocumentNumber}>
              C.I. o RUC: {selectedClient.documentNumber}
            </Text>
            <Text style={styles.clientPhone}>
              Teléfono: {selectedClient.phoneNumber}
            </Text>
            <Text style={styles.clientEmail}>
              Email: {selectedClient.email}
            </Text>
            <TouchableOpacity onPress={handleRemoveClient}>
              <Text style={styles.changeText}>Remover Cliente</Text>
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
            <Text style={styles.saveText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TakenRequirementEditScreen;

/* =======================
   STYLES
   ======================= */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    color: 'red',
    fontWeight: '600',
  },

  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  headerButton: {
    color: '#fff',
    fontWeight: '600',
  },

  contentContainer: {
    padding: 16,
  },

  sectionTitle: {
    marginTop: 16,
    fontWeight: '700',
  },

  clientCard: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
  },

  clientName: {
    fontStyle: 'italic',
    fontSize: 18,
    fontWeight: 'bold',
  },

  clientDocumentNumber: {
    fontSize: 15,
    fontWeight: '500',
  },

  clientPhone: {
    fontSize: 15,
    fontWeight: '500',
  },

  clientEmail: {
    fontSize: 15,
    fontWeight: '500',
  },

  changeText: {
    fontSize: 17,
    color: '#ff0000',
    marginTop: 4,
  },

  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  searchButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },

  createButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  footer: {
    padding: 16,
  },

  saveButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  saveText: {
    color: '#fff',
    fontWeight: '700',
  },

  error: {
    color: 'red',
    fontSize: 12,
  },
});
