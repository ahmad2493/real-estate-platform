const API_BASE_URL = 'http://localhost:5000/api';
const RAG_API_BASE_URL = 'http://localhost:8000';

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

    if (data.code === 'ACCOUNT_SUSPENDED') {
      localStorage.setItem('suspendedUser', 'true');
      window.location.href = '/suspended';
      return;
    }
    return {
      ...data,
      status: response.status,
      success: response.ok && data.success !== false,
    };
  } catch {
    throw new Error('Network error. Please try again.');
  }
};

export const authAPI = {
  // Profile Management

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

  googleSignIn: () => {
    window.location.href = `${API_BASE_URL}/auth/google/signin`;
  },

  googleSignUp: () => {
    window.location.href = `${API_BASE_URL}/auth/google/signup`;
  },

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

  updateUsername: async (newUsername) => {
    return apiCall('/users/username', {
      method: 'PUT',
      body: JSON.stringify({ name: newUsername }), // Changed to match backend expectation
    });
  },

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

  // Agent Management
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
    return apiCall('/agents/status', {
      method: 'GET',
    });
  },

  getAllAgents: async () => {
    return apiCall('/admin/agents', {
      method: 'GET',
    });
  },

  approveAgent: async (agentId, approved, rejectionReason = null) => {
    return apiCall(`/admin/agents/${agentId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({
        approved,
        ...(rejectionReason && { rejectionReason }),
      }),
    });
  },

  suspendAgent: async (agentId) => {
    return apiCall(`/admin/agents/${agentId}/suspend`, {
      method: 'PATCH',
    });
  },

  reactivateAgent: async (agentId) => {
    return apiCall(`/admin/agents/${agentId}/reactivate`, {
      method: 'PATCH',
    });
  },

  // User Management
  getAllUsers: async () => {
    return apiCall('/admin/users', {
      method: 'GET',
    });
  },

  suspendUser: async (userId) => {
    return apiCall(`/admin/users/${userId}/suspend`, {
      method: 'PATCH',
    });
  },

  reactivateUser: async (userId) => {
    return apiCall(`/admin/users/${userId}/reactivate`, {
      method: 'PATCH',
    });
  },

  deleteUser: async (userId) => {
    return apiCall(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

export const propertyAPI = {
  // Get all properties (public route with optional auth)
  getAllProperties: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/properties?${queryString}`, {
      method: 'GET',
    });
  },

  // Get user's own properties (requires auth)
  getMyProperties: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/properties/user/my-properties?${queryString}`, {
      method: 'GET',
    });
  },

  // Create new property (requires auth)
  createProperty: async (propertyData) => {
    return apiCall('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  },

  // Update property (requires auth)
  updateProperty: async (propertyId, propertyData) => {
    return apiCall(`/properties/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData),
    });
  },

  // Delete property (requires auth)
  deleteProperty: async (propertyId, permanent = false) => {
    return apiCall(`/properties/${propertyId}?permanent=${permanent}`, {
      method: 'DELETE',
    });
  },

  // Get single property by ID (public route with optional auth)
  getPropertyById: async (propertyId) => {
    return apiCall(`/properties/${propertyId}`, {
      method: 'GET',
    });
  },

  // Get nearby properties (public route)
  getNearbyProperties: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/properties/location/nearby?${queryString}`, {
      method: 'GET',
    });
  },

  // Toggle featured status (admin only)
  toggleFeatured: async (propertyId) => {
    return apiCall(`/properties/${propertyId}/featured`, {
      method: 'PATCH',
    });
  },

  // Advanced search (public route with optional auth)
  advancedSearch: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/properties/search/advanced?${queryString}`, {
      method: 'GET',
    });
  },

  // Bulk operations (admin only)
  bulkUpdateStatus: async (propertyIds, status) => {
    return apiCall('/properties/bulk/status', {
      method: 'PATCH',
      body: JSON.stringify({ propertyIds, status }),
    });
  },

  // Get property statistics (admin only)
  getPropertyStats: async () => {
    return apiCall('/properties/stats/overview', {
      method: 'GET',
    });
  },
};

export const ragAPI = {
  query: async (userQuery) => {
    try {
      const response = await fetch(`${RAG_API_BASE_URL}/rag_query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });
      if (!response.ok) throw new Error('RAG API error');
      return await response.json();
    } catch (error) {
      console.error('RAG API Error:', error);
      return { answer: "Sorry, I couldn't process your request." };
    }
  },

  queryWithContext: async (userQuery, conversationHistory) => {
    try {
      const response = await fetch(`${RAG_API_BASE_URL}/rag_query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          conversation_history: conversationHistory,
        }),
      });
      if (!response.ok) throw new Error('RAG API error');
      return await response.json();
    } catch (error) {
      console.error('RAG API Error:', error);
      return { answer: "Sorry, I couldn't process your request." };
    }
  },

  generateAndDownloadLease: async (leaseInfo) => {
    try {
      const response = await fetch(`${RAG_API_BASE_URL}/generate_lease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_info: leaseInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate lease');
      }

      // Get the lease ID from headers
      const leaseId = response.headers.get('X-Lease-ID') || 'lease_agreement';

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${leaseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (error) {
      console.error('Error generating lease:', error);
      return false;
    }
  },
};

export const leaseAPI = {
  // Request a lease
  requestLease: async (leaseData) => {
    return apiCall('/leases/request', {
      method: 'POST',
      body: JSON.stringify(leaseData),
    });
  },

  // Upload lease document
  uploadLeaseDocument: async (leaseId, file) => {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('leaseDocument', file);

    try {
      const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/upload-document`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();
      return { ...data, status: response.status, success: response.ok };
    } catch (error) {
      console.error('Upload lease document error:', error);
      throw error;
    }
  },

  // Get lease document URL for viewing
  getLeaseDocument: async (leaseId) => {
    return apiCall(`/leases/${leaseId}/document`, { method: 'GET' });
  },

  // Get lease details
  getLeaseDetails: async (leaseId) => {
    return apiCall(`/leases/${leaseId}`, { method: 'GET' });
  },

  // Get user leases
  getUserLeases: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/leases?${queryString}`, { method: 'GET' });
  },

  // Update lease status
  updateLeaseStatus: async (leaseId, status, notes = '') => {
    return apiCall(`/leases/${leaseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  createDocuSignEnvelope: async (leaseId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/docusign/create-envelope`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create DocuSign envelope error:', error);
      return { success: false, message: 'Failed to create DocuSign session' };
    }
  },

  checkDocuSignStatus: async (leaseId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/docusign/status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Check DocuSign status error:', error);
      return { success: false, message: 'Failed to check signing status' };
    }
  },

  // Enhanced sign lease document with DocuSign option
  signLeaseDocument: async (leaseId, options = {}) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/sign`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          useDocuSign: options.useDocuSign !== false, // Default to true
          signatureType: options.signatureType || 'tenant',
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Sign lease document error:', error);
      return { success: false, message: 'Failed to sign document' };
    }
  },
};

// Update notification API
export const notificationAPI = {
  getNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/notifications?${queryString}`, { method: 'GET' });
  },

  getUnreadCount: async () => {
    return apiCall('/notifications/unread-count', { method: 'GET' });
  },

  markAsRead: async (notificationId) => {
    return apiCall(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  },

  markAllAsRead: async () => {
    return apiCall('/notifications/mark-all-read', { method: 'PATCH' });
  },
};
