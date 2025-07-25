const API_BASE_URL = 'http://localhost:5000/api';

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/signin';
      return;
    }

    const data = await response.json();
    return { ...data, status: response.status };
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const authAPI = {
  login: async (email, password, rememberMe = false) => {
    return apiCall('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
  },

  register: async (userData) => {
    return apiCall('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getCurrentUser: async () => {
    return apiCall('/auth/me');
  },

  // Separate Google OAuth for sign in vs sign up
  googleSignIn: () => {
    window.location.href = `${API_BASE_URL}/auth/google/signin`;
  },

  googleSignUp: () => {
    window.location.href = `${API_BASE_URL}/auth/google/signup`;
  },

  // NEW: Forgot Password Functions
  forgotPassword: async (email) => {
    return apiCall('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, password) => {
    return apiCall(`/users/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
};
