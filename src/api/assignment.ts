import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://worktraceapi.onrender.com"; 

export const getAssignmentsByUser = async (
  userId: string,
  start: string,
  end: string
) => {
  const token = await AsyncStorage.getItem("userToken");

  const response = await axios.get(
    `${API_URL}/AssignmentMobile/GetAssignmentsByUser/user/${userId}?start=${start}&end=${end}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
