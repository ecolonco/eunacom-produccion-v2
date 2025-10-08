import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  credits: number;
  profile?: any;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
  }) => Promise<{ success: boolean; message?: string; user?: User }>;
  refreshAccessToken: () => Promise<boolean>;
  setUserCredits: (newCredits: number) => void;
}

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { accessToken: string } }
  | { type: 'SET_USER'; payload: User };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  console.log('Auth Action:', action.type, action);
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOGIN_SUCCESS':
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
        refreshToken: null,
      };

    case 'LOGOUT':
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
        refreshToken: null,
      };

    case 'REFRESH_TOKEN_SUCCESS':
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken);
      }
      return {
        ...state,
        accessToken: action.payload.accessToken,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // API request helper
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return { response, data };
  };

  // Login function
  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { response, data } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
          },
        });
        return { success: true, user: data.user };
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
        return { success: false, message: data.message };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      return { success: false, message: 'Error de conexión' };
    }
  };

  // Register function
  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
  }) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { response, data } = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (data.success) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
          },
        });
        return { success: true, user: data.user };
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
        return { success: false, message: data.message };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      return { success: false, message: 'Error de conexión' };
    }
  };

  // Refresh access token
  const refreshAccessToken = async (): Promise<boolean> => {
    if (!state.refreshToken) return false;

    try {
      const { response, data } = await apiRequest('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      if (data.success) {
        dispatch({
          type: 'REFRESH_TOKEN_SUCCESS',
          payload: { accessToken: data.accessToken },
        });
        return true;
      } else {
        dispatch({ type: 'LOGOUT' });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.refreshToken) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: state.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Update only user credits locally
  const setUserCredits = (newCredits: number) => {
    if (!state.user) return;
    const updatedUser: User = { ...state.user, credits: newCredits };
    dispatch({ type: 'SET_USER', payload: updatedUser });
  };

  // Get current user info
  const getCurrentUser = async () => {
    if (!state.accessToken) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      const { response, data } = await apiRequest('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${state.accessToken}`,
        },
      });

      if (data.success) {
        dispatch({ type: 'SET_USER', payload: data.user });
      } else {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          dispatch({ type: 'LOGOUT' });
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    if (state.accessToken) {
      getCurrentUser();
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const value: AuthContextType = {
    state,
    login,
    logout,
    register,
    refreshAccessToken,
    setUserCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};