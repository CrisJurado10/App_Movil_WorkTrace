import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = "https://worktraceapi.onrender.com";

export interface CreateEvaluationSessionResponse {
  token: string;
  url: string;
}

/**
 * Crea una sesión de evaluación para un assignment
 * Retorna el token y la URL para generar el QR
 */
export const createEvaluationSession = async (
  assignmentId: string,
): Promise<CreateEvaluationSessionResponse> => {
  const token = await AsyncStorage.getItem('userToken');

  if (!token) {
    throw new Error('Token de usuario no encontrado');
  }

  const response = await fetch(
    `${API_URL}/api/ClientEvaluation/session/${assignmentId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Error creando sesión de evaluación: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
};