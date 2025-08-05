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

  // Password reset functions
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

  // UPDATED: Username change function
  updateUsername: async (newUsername) => {
    return apiCall('/users/username', {
      method: 'PUT',
      body: JSON.stringify({ name: newUsername }), // Changed to match backend expectation
    });
  },

  // UPDATED: Password change function
  updatePassword: async (currentPassword, newPassword) => {
    return apiCall('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getProfile: async () => {
    return apiCall('/users/profile', {
      method: 'GET',
    });
  },

  updateProfile: async (profileData) => {
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // DO NOT set 'Content-Type' for FormData!
        },
        body: profileData,
      });

      const data = await response.json();

      // Handle non-successful responses
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { ...data, status: response.status };
    } catch (error) {
      console.error('updateProfile API error:', error);
      throw error; // Re-throw so the component can handle it
    }
  },

  updateRole: async (role) => {
    const token = localStorage.getItem('authToken');
    return fetch('http://localhost:5000/api/users/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ role }),
    }).then((res) => res.json());
  },

  submitAgentApplication: async (formData) => {
    return apiCall('/agents/apply', {
      method: 'POST',
      body: JSON.stringify({
        licenseNumber: formData.licenseNumber,
        agency: {
          name: formData.agencyName,
          address: formData.agencyAddress,
          phone: formData.agencyPhone,
          website: formData.agencyWebsite,
        },
        specializations: formData.specializations,
      }),
    });
  },

  getAgentApplicationStatus: async () => {
    try {
      const response = await apiCall('/agents/status', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Failed to get agent status:', error);
      throw error;
    }
  },
};
