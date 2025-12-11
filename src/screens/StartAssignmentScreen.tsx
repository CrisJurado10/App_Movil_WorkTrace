
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
  NativeModules
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import useLocationTracking from '../hooks/useLocationTracking';
import { updateProgress, finishAssignment } from '../api/assignmentStart';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [finishing, setFinishing] = useState(false);

  // Obtener stopTracking del hook
  const { stopTracking } = useLocationTracking({
    assignmentId,
    enabled: true,
    intervalMs: 30000,
    onLocationUpdate: (coords) => setLastCoords(coords),
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
    
    return () => clearTimeout(t);
  }, [route.params?.checkIn]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permiso de Cámara',
            message: 'La aplicación necesita acceso a la cámara para tomar fotos.',
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
        Alert.alert('Permiso denegado', 'No se puede abrir la cámara sin permiso.');
        return;
      }

      const image = await ImagePicker.openCamera({
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      if (image) {
        const filename = image.filename || image.path.split('/').pop() || 'photo_cam.jpg';
        setMediaFiles((prev) => [
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
        Alert.alert('Error', 'No se pudo abrir la cámara. Verifica permisos y reinicia.');
      }
    }
  };

  
const buildFormData = (commentText: string, files: UploadFile[]): FormData => {
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
    try {
      setSendingProgress(true);
      const fd = buildFormData(comment, mediaFiles);
      await updateProgress(assignmentId, fd);
      Alert.alert('Progreso actualizado', 'Comentario y fotos enviados.');
      setComment('');
      setMediaFiles([]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el progreso.');
    } finally {
      setSendingProgress(false);
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
        'Check-Out registrado. Volviendo al inicio...',
        [
          {
            text: 'OK',
            onPress: () => {
              // 4. Guardar localmente que esta asignación fue finalizada (para evitar reentrada)
              (async () => {
                try {
                  const raw = await AsyncStorage.getItem('finishedAssignments');
                  const arr = raw ? JSON.parse(raw) : [];
                  const strId = String(assignmentId);
                  if (!arr.includes(strId)) {
                    arr.push(strId);
                    await AsyncStorage.setItem('finishedAssignments', JSON.stringify(arr));
                  }
                } catch (e) {
                  console.warn('No se pudo guardar finishedAssignments:', e);
                }
                // Navegar de vuelta a TecnicoHome (reset para forzar recarga)
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'TecnicoHome' }],
                  })
                );
              })();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      // Detener tracking incluso si hay error
      stopTracking();
      Alert.alert(
        'Error',
        err.message || 'No se pudo finalizar la tarea.'
      );
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
          {lastCoords && <Text style={styles.coords}>Última ubicación: {lastCoords}</Text>}

          {/* Sección para actualizar progreso */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actualizar progreso</Text>
            <TextInput
              style={styles.input}
              placeholder="Escribe un comentario..."
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <View style={{ marginBottom: 10, marginTop: 10 }}>
               <Button title="Tomar Foto (Cámara)" onPress={takePhoto} />
            </View>
            <View style={styles.imagesContainer}>
              {mediaFiles.map((file, idx) => (
                <Image key={idx} source={{ uri: file.uri }} style={styles.imagePreview} />
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
            <Button
              title={finishing ? 'Finalizando...' : 'Finalizar (Check-Out)'}
              onPress={handleFinishAssignment}
              disabled={finishing}
              color="#10B981"
            />
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subText: { fontSize: 16, marginTop: 10 },
  time: { fontSize: 20, fontWeight: 'bold', color: '#2563EB', marginTop: 5 },
  coords: { fontSize: 14, color: '#555', marginTop: 10 },
  section: { width: '100%', marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80 },
  imagesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  imagePreview: { width: 80, height: 80, marginRight: 8, borderRadius: 8 },
});

export default StartAssignmentScreen;
