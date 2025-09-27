import { createContext, useContext, useReducer, useEffect, useMemo, useRef } from 'react';
import { authAPI } from '../services/api';
import Loader from '../components/Loader';

const AuthContext = createContext(undefined);

const initialState = {
  user: null,
  token: localStorage.getItem('adminToken'),
  isAuthenticated: !!localStorage.getItem('adminToken'),
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isInitialized = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          // Verify token with backend
          const response = await authAPI.verifyToken();
          if (response.data && response.data.id) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: response.data,
                token,
              },
            });
          } else {
            localStorage.removeItem('adminToken');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('adminToken');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    if (!isInitialized.current) {
      checkAuth();
      isInitialized.current = true;
    }
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.login(credentials);
      const { token, admin } = response.data;

      localStorage.setItem('adminToken', token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: admin, token },
      });

      return { success: true };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    dispatch({ type: 'LOGOUT' });
  };

  const value = useMemo(() => ({
    ...state,
    login,
    logout,
  }), [state, login, logout]);

  // Don't render children until context is properly initialized
  if (!isInitialized.current && state.loading) {
    return <Loader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};