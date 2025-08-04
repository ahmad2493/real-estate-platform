import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Safe localStorage wrapper
const storage = {
  getItem: (key) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Silently fail in environments without localStorage
    }
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Silently fail in environments without localStorage
    }
  },
};

// Helper function to safely parse JSON
const safeJsonParse = async (response) => {
  const text = await response.text();
  if (!text) {
    throw new Error('Empty response from server');
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error('Failed to parse JSON:', text);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
  }
};

// Async thunks for API calls
export const loginUser = createAsyncThunk(
  'user/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('Attempting login with:', credentials);

      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await safeJsonParse(response);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError.message);
        }
        return rejectWithValue(errorMessage);
      }

      const data = await safeJsonParse(response);
      console.log('Login successful:', data);

      if (data.token) {
        storage.setItem('authToken', data.token);
      }

      return data.user || data; // Handle different response structures
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

export const registerUser = createAsyncThunk(
  'user/register',
  async (userData, { rejectWithValue }) => {
    try {
      console.log('Attempting registration with:', userData);

      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      console.log('Register response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await safeJsonParse(response);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError.message);
        }
        return rejectWithValue(errorMessage);
      }

      const data = await safeJsonParse(response);
      console.log('Registration successful:', data);

      if (data.token) {
        storage.setItem('authToken', data.token);
      }

      return data.user || data;
    } catch (error) {
      console.error('Registration error:', error);
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = storage.getItem('authToken');
      if (!token) {
        return rejectWithValue('No auth token found');
      }

      console.log('Fetching user profile with token');

      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Profile response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired
          storage.removeItem('authToken');
          return rejectWithValue('Authentication expired');
        }

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await safeJsonParse(response);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError.message);
        }
        return rejectWithValue(errorMessage);
      }

      const data = await safeJsonParse(response);
      console.log('Profile fetch successful:', data);

      return data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      storage.removeItem('authToken');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Fetch profile cases
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Don't clear isAuthenticated here unless it's an auth error
        if (
          action.payload?.includes('Authentication expired') ||
          action.payload?.includes('No auth token')
        ) {
          state.isAuthenticated = false;
          state.user = null;
        }
      });
  },
});

export const { setUser, setLoading, setError, clearError, logout } = userSlice.actions;
export default userSlice.reducer;
