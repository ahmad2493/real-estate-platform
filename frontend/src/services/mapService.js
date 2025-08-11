const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

const throttledFetch = async (url) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();

  // Use throttled fetch with proper headers
  return fetch(url, {
    headers: {
      'User-Agent': 'PropTech-Platform/1.0 (contact@proptech.com)',
    },
  });
};

export const mapService = {
  // Search for addresses using Nominatim (OpenStreetMap's geocoding service)
  searchAddresses: async (query) => {
    try {
      const url = `${NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
      const response = await throttledFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.map((item) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: {
          street: `${item.address?.house_number || ''} ${item.address?.road || ''}`.trim(),
          city: item.address?.city || item.address?.town || item.address?.village || '',
          state: item.address?.state || '',
          zipCode: item.address?.postcode || '',
          country: item.address?.country || 'USA',
        },
      }));
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  },

  // Reverse geocoding - get address from coordinates
  getAddressFromCoordinates: async (lat, lon) => {
    try {
      const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      const response = await throttledFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.address) {
        return {
          street: `${data.address?.house_number || ''} ${data.address?.road || ''}`.trim(),
          city: data.address?.city || data.address?.town || data.address?.village || '',
          state: data.address?.state || '',
          zipCode: data.address?.postcode || '',
          country: data.address?.country || 'USA',
          display_name: data.display_name,
        };
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  },

  // Get coordinates from address string
  getCoordinatesFromAddress: async (addressString) => {
    try {
      const url = `${NOMINATIM_BASE_URL}/search?format=json&limit=1&q=${encodeURIComponent(addressString)}`;
      const response = await throttledFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },
};
