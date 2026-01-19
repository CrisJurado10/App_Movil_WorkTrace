import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import FormInput from '../components/FormInput';
import { createClient } from '../api/takenRequirement';
import { VALIDATION_RULES } from '../constants/validationRules';

const ClientCreateScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { documentNumber, origin, draft, requirementId } = route.params;

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const handleSave = async () => {
    try {
      const client = await createClient({
        fullName: fullName.trim(),
        documentNumber,
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
      });

      if (origin === 'edit') {
        navigation.navigate({
          name: 'TakenRequirementEdit',
          params: {
            selectedClient: client,
            requirementToEdit: route.params.requirementToEdit,
          },
          merge: true,
        });
      } else {
        navigation.navigate('TakenRequirementCreate', {
          selectedClient: client,
          draft,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el cliente');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nuevo Cliente</Text>

      <FormInput
        label="Nombre Completo"
        value={fullName}
        onChangeText={setFullName}
        required
        maxLength={VALIDATION_RULES.Client.FullName.maxLength}
      />
      <FormInput
        label="Teléfono"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        required
        maxLength={VALIDATION_RULES.Client.PhoneNumber.maxLength}
      />
      <FormInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        required
        maxLength={VALIDATION_RULES.Client.Email.maxLength}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Guardar Cliente</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ClientCreateScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  saveText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
