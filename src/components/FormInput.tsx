import React, { useCallback } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength = 128,
  minLength,
  required = false,
  error,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  keyboardType = 'default',
}) => {
  const handleChangeText = useCallback((text: string) => {
    // Limitar a maxLength automáticamente
    if (text.length <= maxLength) {
      onChangeText(text);
    }
  }, [onChangeText, maxLength]);

  const hasError = !!error;
  const currentLength = value.length;
  const showCounter = multiline || maxLength < 256;

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}>*</Text>}
        </Text>
        {showCounter && (
          <Text style={[styles.counter, currentLength === maxLength && styles.counterMax]}>
            {currentLength} / {maxLength}
          </Text>
        )}
      </View>

      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          hasError && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#999"
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        keyboardType={keyboardType}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#e74c3c',
    marginLeft: 4,
  },
  counter: {
    fontSize: 12,
    color: '#999',
  },
  counterMax: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fef5f5',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
});

export default React.memo(FormInput);