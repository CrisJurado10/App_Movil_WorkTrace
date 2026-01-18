import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseValidationErrors } from '../constants/validationRules';

const API_URL = 'http://192.168.100.3:5284';

/* =======================
   INTERFACES
   ======================= */
export interface ClientInformationResponse {
  id: string;
  fullName: string;
  documentNumber: string;
  email: string;
  phoneNumber: string;
}

export interface CreateClientRequest {
  fullName: string;
  documentNumber: string;
  phoneNumber: string;
  email: string;
}

export interface CreateTakenRequirementRequest {
  userId: string;
  clientId?: string | null;
  title: string;
  description: string;
}

export interface UpdateTakenRequirementRequest {
  id: string;
  clientId?: string | null;
  title: string;
  description: string;
}

/* =======================
   CLIENTES
   ======================= */
export const searchClientByDoc = async (documentNumber: string) => {
  const token = await AsyncStorage.getItem('userToken');

  try {
    const response = await axios.get(
      `${API_URL}/Client/GetByDocumentNumber/by-docnum?documentNumber=${encodeURIComponent(
        documentNumber
      )}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error: any) {
    const validationErrors = parseValidationErrors(error);
    throw {
      validationErrors,
      message: error.response?.data?.title || 'Error al buscar cliente',
      status: error.response?.status,
    };
  }
};

export const createClient = async (
  payload: CreateClientRequest
): Promise<ClientInformationResponse> => {
  const token = await AsyncStorage.getItem('userToken');

  const body = {
    FullName: payload.fullName,
    DocumentNumber: payload.documentNumber,
    PhoneNumber: payload.phoneNumber,
    Email: payload.email,
  };

  try {
    const response = await axios.post(`${API_URL}/Client/Create`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    const validationErrors = parseValidationErrors(error);
    throw {
      validationErrors,
      message: error.response?.data?.title || 'Error al crear cliente',
      status: error.response?.status,
    };
  }
};

/* =======================
   CREATE TAKEN REQUIREMENT (FIX REAL)
   ======================= */
export const createTakenRequirement = async (
  payload: CreateTakenRequirementRequest
) => {
  const token = await AsyncStorage.getItem('userToken');

  // 🔥 CLAVE: NO enviar ClientId si es null
  const body: any = {
    UserId: payload.userId,
    Title: payload.title,
    Description: payload.description,
  };

  if (payload.clientId) {
    body.ClientId = payload.clientId;
  }

  try {
    console.log(
      'Creating taken requirement payload:',
      JSON.stringify(body, null, 2)
    );

    const response = await axios.post(
      `${API_URL}/TakenRequirements/Create`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('CreateTakenRequirement Error:', {
      status: error.response?.status,
      data: error.response?.data,
      payload: body,
    });

    const validationErrors = parseValidationErrors(error);
    throw {
      validationErrors,
      message:
        error.response?.data?.title ||
        error.response?.data?.message ||
        'Error al crear requerimiento',
      status: error.response?.status,
    };
  }
};

/* =======================
   UPDATE TAKEN REQUIREMENT
   ======================= */
export const updateTakenRequirement = async (
  payload: UpdateTakenRequirementRequest
) => {
  const token = await AsyncStorage.getItem('userToken');

  const body: any = {
    Title: payload.title,
    Description: payload.description,
  };

  if (payload.clientId) {
    body.ClientId = payload.clientId;
  }

  try {
    const response = await axios.put(
      `${API_URL}/TakenRequirements/Update/${encodeURIComponent(payload.id)}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    const validationErrors = parseValidationErrors(error);
    throw {
      validationErrors,
      message: error.response?.data?.title || 'Error al actualizar requerimiento',
      status: error.response?.status,
    };
  }
};

/* =======================
   GETTERS
   ======================= */
export const getTakenRequirementsByUserAndDateRange = async (
  userId: string,
  start: string,
  end: string
) => {
  const token = await AsyncStorage.getItem('userToken');

  const response = await axios.get(
    `${API_URL}/TakenRequirements/GetByUserAndDateRange/user-taken-requirement/${userId}?start=${encodeURIComponent(
      start
    )}&end=${encodeURIComponent(end)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const getClientById = async (clientId: string) => {
  const token = await AsyncStorage.getItem('userToken');

  const response = await axios.get(
    `${API_URL}/Client/GetById?id=${encodeURIComponent(clientId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};
