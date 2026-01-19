import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseValidationErrors } from '../constants/validationRules';

const API_URL = 'https://worktraceapi.onrender.com';

export interface ClientInformationResponse {
  id: string;
  fullName: string;
  documentNumber: string;
  email: string;
  phoneNumber: string;
}

export interface TakenRequirementInformationResponse {
  id: string;
  userId: string;
  clientId?: string | null;
  date: string;
  title: string;
  description: string;
}

export interface TakenRequirementWithClientResponse {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  client?: ClientInformationResponse | null;
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

export const searchClientByDoc = async (documentNumber: string) => {
  const token = await AsyncStorage.getItem('userToken');

  try {
    const response = await axios.get(
      `${API_URL}/Client/GetByDocumentNumber/by-docnum?documentNumber=${encodeURIComponent(
        documentNumber,
      )}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
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
  payload: CreateClientRequest,
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

export const createTakenRequirement = async (
  payload: CreateTakenRequirementRequest,
): Promise<TakenRequirementInformationResponse> => {
  const token = await AsyncStorage.getItem('userToken');

  const body: any = {
    UserId: payload.userId,
    Title: payload.title,
    Description: payload.description,
  };

  if (payload.clientId) {
    body.ClientId = payload.clientId;
  }

  try {
    const response = await axios.post(
      `${API_URL}/TakenRequirements/Create`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error: any) {
    const validationErrors = parseValidationErrors(error);
    throw {
      validationErrors,
      message:
        error.response?.data?.message ||
        error.response?.data?.title ||
        'Error al crear requerimiento',
      status: error.response?.status,
    };
  }
};

export const updateTakenRequirement = async (
  payload: UpdateTakenRequirementRequest,
): Promise<TakenRequirementInformationResponse> => {
  const token = await AsyncStorage.getItem('userToken');

  const body: any = {
    Title: payload.title,
    Description: payload.description,
  };

  if (payload.clientId !== undefined) {
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
      },
    );

    return response.data;
  } catch (error: any) {
    const validationErrors = parseValidationErrors(error);
    throw {
      validationErrors,
      message:
        error.response?.data?.message ||
        error.response?.data?.title ||
        'Error al actualizar requerimiento',
      status: error.response?.status,
    };
  }
};

export const getTakenRequirementsByUserAndDateRange = async (
  userId: string,
  start: string,
  end: string,
): Promise<TakenRequirementWithClientResponse[]> => {
  const token = await AsyncStorage.getItem('userToken');

  const response = await axios.get(
    `${API_URL}/TakenRequirements/GetByUserAndDateRange/user-taken-requirement/${userId}?start=${encodeURIComponent(
      start,
    )}&end=${encodeURIComponent(end)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return response.data;
};
