
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
  Image
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import useLocationTracking from '../hooks/useLocationTracking';
import { updateProgress, finishAssignment } from '../api/assignmentStart';

const StartAssignmentScreen = ({ route, navigation }) => {
  const { assignmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [lastCoords, setLastCoords] = useState<string>('');

  const [comment, setComment] = useState<string>('');
  const [mediaFiles, setMediaFiles] = useState<{ uri: string; type: string; name?: string }[]>([]);
  const [sendingProgress, setSendingProgress] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useLocationTracking({
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

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel) return;

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaFiles((prev) => [
        ...prev,
        {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'photo.jpg',
        },
      ]);
    }
  };

  
const buildFormData = (commentText: string, files: UploadFile[]) => {
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
      await finishAssignment(assignmentId, { checkOut: checkout });
      Alert.alert('Tarea finalizada', 'Check-Out registrado.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo finalizar la tarea.');
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
            <Button title="Agregar foto" onPress={pickImage} />
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
