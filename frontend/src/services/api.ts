import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          if (response.data.success) {
            localStorage.setItem('accessToken', response.data.accessToken);
            // Retry the original request
            error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
            return apiClient.request(error.config);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Generic API request function
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  params?: any
): Promise<T> => {
  try {
    const response = await apiClient.request<T>({
      method,
      url,
      data,
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error(`API Error (${method} ${url}):`, error);
    throw new Error(error.response?.data?.message || 'Network error');
  }
};

export default apiClient;