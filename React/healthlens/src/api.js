import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // Django backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = Cookies.get("refresh_token");

      if (refreshToken) {
        // Try refreshing the token
        try {
          const response = await api.post("/auth/token/refresh/", {
            refresh: refreshToken,
          });
          // Save the new access token
          Cookies.set("auth_token", response.data.access, { expires: 1 });
          // Retry the original request with the new token
          error.config.headers[
            "Authorization"
          ] = `Bearer ${response.data.access}`;
          return api(error.config); // Retry the request
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);
          Cookies.remove("auth_token");
          Cookies.remove("refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API

export const loginUser = async (credentials) => {
  try {
    const response = await api.post("/auth/login/", {
      email: credentials.email,
      password: credentials.password,
    });
    Cookies.set("auth_token", response.data.token, { expires: 1 });
    Cookies.set("refresh_token", response.data.refresh, { expires: 7 }); // Store refresh token
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout/");
    Cookies.remove("auth_token");
    Cookies.remove("refresh_token");
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    console.log("Sending to /auth/register/:", userData);
    const response = await api.post("/auth/register/", userData);

    // Save the token and authenticate the user immediately
    if (response.data.token) {
      Cookies.set("auth_token", response.data.token, { expires: 1 });
      Cookies.set("refresh_token", response.data.refresh, { expires: 7 });
    }

    console.log("Register response:", response.status, response.data);
    return response.data;
  } catch (error) {
    console.error("Registration error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error.response?.data || error;
  }
};

export const resetPassword = async (email) => {
  try {
    const response = await api.post("/auth/reset-password/", { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const verifyAuth = async () => {
  try {
    const response = await api.get("/auth/verify/");
    const user = response.data.user;
    console.log(user);
    return {
      isAuthenticated: true,
      role: user.role,
      id: user.id,
      username: user.username,
    };
  } catch (error) {
    return { isAuthenticated: false, role: null };
  }
};

// Patient Dashboard API calls
export const getPatientData = async () => {
  try {
    const response = await api.get("/patients/");
    return response.data;
  } catch (error) {
    console.error("Error fetching patient data:", error);
    throw error;
  }
};

// Manager Dashboard API calls
export const getManagerData = async () => {
  try {
    const response = await api.get("/manager/");
    return response.data;
  } catch (error) {
    console.error("Error fetching manager data:", error);
    throw error;
  }
};

// Doctor Dashboard API calls
export const getDoctorData = async () => {
  try {
    const response = await api.get("/doctor/");
    return response.data;
  } catch (error) {
    console.error("Error fetching doctor data:", error);
    throw error;
  }
};

export const fetchPreviousResults = async () => {
  try {
    const response = await api.get(`aimodels/previous_results/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const sendAnalysisRequest = async (inputData, image) => {
  try {
    const formData = new FormData();
    formData.append(
      "input_data",
      typeof inputData === "object" ? JSON.stringify(inputData) : inputData
    );
    if (image) {
      formData.append("image", image);
    }

    const response = await api.post(`aimodels/analyze/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Full error details:", error);
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data || {};
      if (status === 400) {
        return {
          success: false,
          error:
            errorData.error || "Invalid request or no matching disease found.",
        };
      } else if (status === 500) {
        return {
          success: false,
          error: "Server error occurred. Please try again later.",
        };
      } else {
        return {
          success: false,
          error: errorData.error || "An unexpected error occurred.",
        };
      }
    }
    // Catch-all for network errors or other exceptions
    return { success: false, error: "Network or unexpected error occurred." };
  }
};

// Function to fetch user profile data
export const getUserProfile = async () => {
  try {
    const response = await api.get("/user/profile/"); // Fixed URL
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching user profile:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch user profile");
  }
};

// Function to update user profile data
export const updateUserProfile = async (userInfo) => {
  try {
    const response = await api.put("/user/update/", userInfo);
    return response.data;
  } catch (error) {
    throw new Error("Failed to update user profile");
  }
};

export const addDoctor = async (payload) => {
  try {
    payload.experience = Number(payload.experience);
    console.log("Payload being sent to API:", payload);
    const response = await api.post("/doctors/", payload);
    console.log("Doctor created:", response.data);
    alert("Doctor added successfully!");
  } catch (error) {
    console.error(
      "Error adding doctor:",
      error.response?.data || error.message
    );
    alert("Failed to add doctor. Check console for details.");
    throw error; // Re-throw for DoctorActivity.js to handle
  }
};

export const getDoctors = async () => {
  const response = await api.get("/doctor/details/");
  console.log("Doctor details response:", response.data);
  return response.data;
};

export const updateDoctorAvailability = async (
  doctorId,
  availabilityStatus
) => {
  const url = `/doctormatch/${doctorId}/update_availability/`;
  console.log("Requesting URL:", `http://localhost:8000${url}`);
  console.log("Doctor ID:", doctorId);
  console.log("Payload:", { availability_status: availabilityStatus });
  try {
    const response = await api.patch(url, {
      availability_status: availabilityStatus,
    });
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error updating doctor availability:",
      error.response || error
    );
    throw new Error("Failed to update doctor availability");
  }
};

// Fetch all users
export const getUsers = async () => {
  try {
    const response = await api.get("/user/");
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching users:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Fetch appointments
export const getAppointments = async () => {
  try {
    const response = await api.get("/appointments/");
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching appointments:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Fetch user-specific appointments
// api.js
export const getUserAppointments = async () => {
  try {
    const response = await api.get("/appointments/");
    return response.data; // Backend handles filtering
  } catch (error) {
    console.error(
      "Error fetching user appointments:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Create a new appointment
export const createAppointment = async (appointment) => {
  try {
    const response = await api.post("/appointments/", appointment);
    return response.data;
  } catch (error) {
    console.error(
      "Error creating appointment:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Approve or decline an appointment
export const updateAppointmentApproval = async (
  appointmentId,
  role,
  status
) => {
  try {
    const field =
      role === "patient" ? "approval_status_patient" : "approval_status_doctor";
    const response = await api.patch(`/appointments/${appointmentId}/`, {
      [field]: status,
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error updating appointment approval:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const getAvailableUsers = async () => {
  try {
    const response = await api.get(`/available-users/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching available users:", error);
    return [];
  }
};

export const getMessages = async (conversationId) => {
  try {
    const response = await api.get(`/messages/${conversationId}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

export const sendMessage = async (conversationId, messageData) => {
  try {
    const response = await api.post(
      `/messages/${conversationId}/send/`,
      messageData
    );
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
};

export const getOrCreateConversation = async (userId) => {
  try {
    const response = await api.post(`/conversations/`, {
      participants: [userId],
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching or creating conversation:", error);
    return null;
  }
};

export const getUserData = async (userId) => {
  try {
    const response = await api.get(`/user/${userId}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const fetchPendingRequests = async () => {
  try {
    const response = await api.get("/reports/requests/");
    return response.data;
  } catch (error) {
    console.error("Error fetching requests:", error);
    return [];
  }
};

export const getDoctorByUserId = async (userId) => {
  try {
    const response = await api.get(`/doctors/?user=${userId}`);
    return response.data[0]?.id; // Assuming one Doctor per User
  } catch (error) {
    console.error("Error fetching doctor:", error);
    throw error;
  }
};

export const createPrescription = async ({
  medication,
  doctorId,
  patientId,
}) => {
  try {
    const doctorPk = await getDoctorByUserId(doctorId);
    const response = await api.post("/prescriptions/", {
      medication: medication || "No medication specified",
      doctor: doctorPk,
      patient: patientId,
      dosage: "As prescribed",
    });
    return response.data;
  } catch (error) {
    console.error("Error creating prescription:", error);
    throw error;
  }
};

export const fetchPatientsForDoctor = async (doctorId) => {
  try {
    const response = await api.get("/user/", { params: { role: "patient" } });
    return response.data.map((user) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
    }));
  } catch (error) {
    console.error("Error fetching patients for doctor:", error);
    throw error;
  }
};

export const createReport = async (reportData) => {
  try {
    const response = await api.post("/reports/", reportData);
    return response.data;
  } catch (error) {
    console.error(
      "Error creating report:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const fetchPatientReports = async (patientId = null) => {
  try {
    const url = patientId ? `/reports/patient/${patientId}/` : "/reports/";
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching patient reports:", error);
    throw error;
  }
};

export const approveReport = async (reportId) => {
  try {
    const response = await api.post(`/reports/${reportId}/approve/`);
    return response.data;
  } catch (error) {
    console.error(
      "Error approving report:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const requestReport = async () => {
  try {
    const response = await api.post("/reports/request/");
    return response.data;
  } catch (error) {
    console.error(
      "Error requesting report:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export function createWebSocketConnection() {
  // Retrieve the token from cookies (or wherever you store it)
  const token = Cookies.get("auth_token");
  if (!token) {
    console.error("No token found!");
    return null; // or handle this case appropriately
  }

  // Create a WebSocket connection with the token
  const ws = new WebSocket(`ws://127.0.0.1:8000/ws/video/?token=${token}`);

  ws.onopen = () => {
    console.log("WebSocket connection opened");
  };

  ws.onclose = (event) => {
    console.log("WebSocket connection closed", event);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error", error);
  };

  return ws;
}
export async function checkCallStatus(callSessionId) {
  try {
    const response = await api.get(`/call/${callSessionId}/status/`);
    return {
      isConnected: response.data.isConnected || false, // Access response.data
    };
  } catch (error) {
    console.error(
      `Error checking call status for session ${callSessionId}:`,
      error.response?.data || error.message
    );
    return { isConnected: false }; // Consistent fallback
  }
}
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const response = await api.post("/auth/token/refresh/", {
            refresh: refreshToken,
          });
          Cookies.set("auth_token", response.data.access, { expires: 1 });
          error.config.headers[
            "Authorization"
          ] = `Bearer ${response.data.access}`;
          return api(error.config);
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);
          Cookies.remove("auth_token");
          Cookies.remove("refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);
export const startCallSession = async (data) => {
  console.log("Start call session API payload:", data); // Check the payload here
  try {
    const response = await api.post(`/call/start/`, data, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("Call session started:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to start call session:",
      error.response?.data || error
    );
    throw error;
  }
};

export const endCallSession = async (sessionId) => {
  try {
    await api.post(`/call/end/`, { session_id: sessionId });
  } catch (error) {
    console.error("Failed to end call session:", error);
  }
};
