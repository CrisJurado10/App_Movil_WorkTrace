import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Button,
  Alert,
  ScrollView,
  Image,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import QRCode from 'react-native-qrcode-svg';
import useLocationTracking from '../hooks/useLocationTracking';
import {
  updateProgress,
  finishAssignment,
  fetchStartDetail,
  StartAssignmentDetailResponse,
} from '../api/assignmentStart';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEvaluationSession } from '../api/assignmentEvaluation';
import { getErrorMessage } from '../utils/errorHandler';

// Interfaz para los archivos de media
interface UploadFile {
  uri: string;
  type: string;
  name?: string;
}

const StartAssignmentScreen = ({ route, navigation }) => {
  const { assignmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [lastCoords, setLastCoords] = useState<string>('');

  const [comment, setComment] = useState<string>('');
  const [mediaFiles, setMediaFiles] = useState<UploadFile[]>([]);
  const [sendingProgress, setSendingProgress] = useState(false);
  const [progressSent, setProgressSent] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [startDetail, setStartDetail] =
    useState<StartAssignmentDetailResponse | null>(null);

  // Obtener stopTracking del hook
  const { stopTracking } = useLocationTracking({
    assignmentId,
    enabled: true,
    intervalMs: 30000,
    onLocationUpdate: coords => setLastCoords(coords),
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);

    // Si viene checkIn en params, usarlo. Si no, usar ahora.
    if (route.params?.checkIn) {
      const d = new Date(route.params.checkIn);
      setCheckInTime(d.toLocaleString());
    } else {
      const now = new Date().toLocaleString();
      setCheckInTime(now);
    }

    // Fetch start details (Service Steps)
    fetchStartDetail(assignmentId).then(data => {
      setStartDetail(data);
    });

    return () => clearTimeout(t);
  }, [route.params?.checkIn, assignmentId]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permiso de Cámara',
            message:
              'La aplicación necesita acceso a la cámara para tomar fotos.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically via Info.plist
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permiso denegado',
          'No se puede abrir la cámara sin permiso.',
        );
        return;
      }

      const image = await ImagePicker.openCamera({
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      if (image) {
        const filename =
          image.filename || image.path.split('/').pop() || 'photo_cam.jpg';
        setMediaFiles(prev => [
          ...prev,
          {
            uri: image.path,
            type: image.mime || 'image/jpeg',
            name: filename,
          },
        ]);
      }
    } catch (e: any) {
      if (e.code !== 'E_PICKER_CANCELLED') {
        console.error('TakePhoto Error:', e);
        Alert.alert(
          'Error',
          'No se pudo abrir la cámara. Verifica permisos y reinicia.',
        );
      }
    }
  };

  const buildFormData = (
    commentText: string,
    files: UploadFile[],
  ): FormData => {
    const fd = new FormData();
    if (commentText) fd.append('Comment', commentText);
    files.forEach(file => {
      fd.append('MediaFiles', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);
    });
    return fd;
  };

  const handleUpdateProgress = async () => {
    if (!comment.trim() || mediaFiles.length === 0) {
      Alert.alert(
        'Campos incompletos',
        'Debes escribir un comentario y tomar una foto antes de enviar el progreso.',
      );
      return;
    }

    try {
      setSendingProgress(true);
      const fd = buildFormData(comment, mediaFiles);
      await updateProgress(assignmentId, fd);
      Alert.alert('Progreso actualizado', 'Comentario y fotos enviados.');
      setProgressSent(true);
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSendingProgress(false);
    }
  };

  const handleGenerateQr = async () => {
    try {
      setLoadingQr(true);

      const session = await createEvaluationSession(assignmentId);

      setQrUrl(session.url);
      setQrVisible(true);
    } catch (error: any) {
      console.error('Error creando sesión QR:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setLoadingQr(false);
    }
  };

  const handleFinishAssignment = async () => {
    try {
      setFinishing(true);
      const checkout = new Date().toISOString();

      // 1. Detener el envío de ubicación local inmediatamente (interval del hook)
      stopTracking();
      console.log('📍 Tracking detenido antes de finalizar tarea');

      // 2. Enviar el check-out
      await finishAssignment(assignmentId, { checkOut: checkout });

      // 3. Mostrar alerta y navegar después de confirmar
      Alert.alert(
        'Tarea finalizada',
        'Check-Out registrado. El cliente ahora puede evaluar el servicio.',
        [
          {
            text: 'Generar QR',
            onPress: async () => {
              // 1. Guardar localmente que esta asignación fue finalizada
              try {
                const raw = await AsyncStorage.getItem('finishedAssignments');
                const arr = raw ? JSON.parse(raw) : [];
                const strId = String(assignmentId);
                if (!arr.includes(strId)) {
                  arr.push(strId);
                  await AsyncStorage.setItem(
                    'finishedAssignments',
                    JSON.stringify(arr),
                  );
                }
              } catch (e) {
                console.warn('No se pudo guardar finishedAssignments:', e);
              }

              // 2. Generar sesión de evaluación y mostrar QR
              await handleGenerateQr();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (err: any) {
      // Detener tracking incluso si hay error
      stopTracking();
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <>
          <Text style={styles.title}>Tarea iniciada</Text>
          <Text style={styles.subText}>Check-In realizado a las:</Text>
          <Text style={styles.time}>{checkInTime}</Text>
          <Text style={styles.subText}>Ubicación enviada cada 30 segundos</Text>
          {lastCoords && (
            <Text style={styles.coords}>Última ubicación: {lastCoords}</Text>
          )}

          {/* Sección de Pasos del Servicio */}
          {startDetail?.installationSteps &&
            startDetail?.installationSteps?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pasos del Servicio</Text>
                <View style={styles.card}>
                  <Text style={styles.serviceName}>
                    {startDetail?.serviceName ?? 'Servicio'}
                  </Text>
                  <Text style={styles.serviceDescription}>
                    {startDetail?.serviceDescription ??
                      'Sin descripción disponible.'}
                  </Text>
                  <View style={styles.stepsContainer}>
                    {startDetail?.installationSteps?.map((step, index) => (
                      <View key={index} style={styles.stepItem}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>
                            {step?.stepNumber ?? index + 1}
                          </Text>
                        </View>
                        <View style={styles.stepContent}>
                          {step?.stepName ? (
                            <Text style={styles.stepName}>
                              {step?.stepName ?? ''}
                            </Text>
                          ) : null}
                          <Text style={styles.stepDescription}>
                            {step?.description ?? 'Paso sin descripción'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

          {/* Sección para actualizar progreso */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actualizar progreso</Text>
            <TextInput
              style={styles.input}
              placeholder="Escribir un comentario sobre el progreso..."
              placeholderTextColor="#5d636c"
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <View style={{ marginBottom: 10, marginTop: 10 }}>
              <Button title="Tomar Foto (Cámara)" onPress={takePhoto} />
            </View>
            <View style={styles.imagesContainer}>
              {mediaFiles.map((file, idx) => (
                <Image
                  key={idx}
                  source={{ uri: file.uri }}
                  style={styles.imagePreview}
                />
              ))}
            </View>
            <Button
              title={sendingProgress ? 'Enviando...' : 'Enviar progreso'}
              onPress={handleUpdateProgress}
              disabled={sendingProgress}
              color="#2563EB"
            />
          </View>

          {/* Sección para finalizar tarea */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finalizar tarea</Text>
            <TouchableOpacity
              style={[
                styles.customButton,
                {
                  backgroundColor:
                    !progressSent || finishing ? '#9CA3AF' : '#10B981',
                },
              ]}
              onPress={handleFinishAssignment}
              disabled={finishing || !progressSent}
            >
              <Text style={styles.customButtonText}>
                {finishing ? 'Finalizando...' : 'Finalizar (Check-Out)'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      {qrVisible && qrUrl && (
        <View style={styles.qrOverlay}>
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Evaluación del Cliente</Text>

            {loadingQr ? (
              <ActivityIndicator size="large" />
            ) : (
              <QRCode value={qrUrl} size={220} />
            )}

            <Text style={styles.qrHint}>
              El cliente debe escanear este código para evaluar el servicio
            </Text>

            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={async () => {
                setQrVisible(false);

                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'TecnicoHome' }],
                  }),
                );
              }}
            >
              <Text style={styles.qrCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subText: { fontSize: 16, marginTop: 10 },
  time: { fontSize: 20, fontWeight: 'bold', color: '#2563EB', marginTop: 5 },
  coords: { fontSize: 14, color: '#555', marginTop: 10 },
  section: { width: '100%', marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  imagePreview: { width: 80, height: 80, marginRight: 8, borderRadius: 8 },
  customButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  customButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '85%',
  },

  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  qrHint: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },

  qrCloseButton: {
    marginTop: 20,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  qrCloseText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default StartAssignmentScreen;