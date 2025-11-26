import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.159.115:5284";

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
  id: string,
  payload: StartAssignmentRequest
) => {
  const token = await AsyncStorage.getItem("userToken");

  return axios.post(
    `${API_URL}/AssignmentMobile/StartAssignment/${id}/start`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
};


// ----------- UPDATE LOCATION EVERY 30 SEC --------------
export interface UpdateLocationRequest {
  currentLocation: LocationPayload;
}

export const updateLocation = async (
  id: string,
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
