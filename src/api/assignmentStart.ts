import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://worktraceapi.onrender.com";

export interface LocationPayload {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

// ----------- START ASSIGNMENT (Check-In) --------------
export interface StartAssignmentRequest {
  checkIn: string;
  currentLocation: LocationPayload;
}

export const startAssignment = async (
  id: string | number,
  payload: StartAssignmentRequest
): Promise<StartAssignmentResponse> => {
  const token = await AsyncStorage.getItem("userToken");
  // Try primary endpoint, fallback to legacy route with /start if necessary
  const primaryUrl = `${API_URL}/AssignmentMobile/StartAssignment/${id}`;
  const fallbackUrl = `${API_URL}/AssignmentMobile/StartAssignment/${id}/start`;

  try {
    const response = await axios.post(primaryUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (err: any) {
    // If primary failed with 404 or the server expects the older route, try fallback
    const status = err?.response?.status;
    if (status === 404 || status === 405 || (err?.code === 'ENOTFOUND')) {
      const response = await axios.post(fallbackUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    }

    // Re-throw original error for caller to handle
    throw err;
  }
};


// ----------- UPDATE LOCATION EVERY 30 SEC --------------
export interface UpdateLocationRequest {
  currentLocation: LocationPayload;
}

export const updateLocation = async (
  id: string | number,
  payload: UpdateLocationRequest
) => {
  const token = await AsyncStorage.getItem("userToken");

  return axios.put(
    `${API_URL}/AssignmentMobile/UpdateLocation/${id}/location`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
};

// ----------- UPDATE PROGRESS (multipart/form-data) --------------
export const updateProgress = async (id: string | number, formData: FormData) => {
  const token = await AsyncStorage.getItem("userToken");

  return axios.put(`${API_URL}/AssignmentMobile/UpdateProgress/${id}/progress`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

// ----------- FINISH ASSIGNMENT --------------
export interface FinishAssignmentRequest {
  checkOut: string;
}

export const finishAssignment = async (
  id: string | number,
  payload: FinishAssignmentRequest
) => {
  const token = await AsyncStorage.getItem("userToken");

  return axios.post(`${API_URL}/AssignmentMobile/FinishAssignment/${id}/finish`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

// ----------- GET START DETAIL (Service Steps) --------------
export interface InstallationStep {
  stepNumber: number;
  stepName?: string;
  description: string;
}

export interface StartAssignmentDetailResponse {
  serviceName: string;
  serviceDescription: string;
  installationSteps: InstallationStep[];
}

export const fetchStartDetail = async (
  id: string | number
): Promise<StartAssignmentDetailResponse> => {
  const token = await AsyncStorage.getItem("userToken");
  const defaultResponse: StartAssignmentDetailResponse = {
    serviceName: "Servicio",
    serviceDescription: "Sin información adicional.",
    installationSteps: [],
  };

  try {
    const response = await axios.get<StartAssignmentDetailResponse>(
      `${API_URL}/AssignmentMobile/GetStartAssignmentDetail/${id}/start-detail`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data || defaultResponse;
  } catch (err) {
    console.warn("fetchStartDetail failed, returning default.", err);
    return defaultResponse;
  }
};