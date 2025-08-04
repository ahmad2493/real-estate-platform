import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchProperties = createAsyncThunk(
  'property/fetchProperties',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`/api/properties?${queryParams}`);

      if (!response.ok) {
        return rejectWithValue('Failed to fetch properties');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const propertySlice = createSlice({
  name: 'property',
  initialState: {
    properties: [],
    featuredProperties: [],
    currentProperty: null,
    loading: false,
    error: null,
    filters: {},
  },
  reducers: {
    setFilters(state, action) {
      state.filters = action.payload;
    },
    setCurrentProperty(state, action) {
      state.currentProperty = action.payload;
    },
    clearProperties(state) {
      state.properties = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.loading = false;
        state.properties = action.payload;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, setCurrentProperty, clearProperties } = propertySlice.actions;
export default propertySlice.reducer;
