import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  MapPin,
  DollarSign,
  Home,
  Bed,
  Bath,
  Square,
  Car,
  Calendar,
  Tag,
  Camera,
  Video,
  Trash2,
  Plus,
  Eye,
  Save,
  AlertCircle,
  CheckCircle,
  Map,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { authAPI, propertyAPI } from '../services/api';

const PropertyForm = ({ property, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    type: 'Apartment',
    category: 'Rent',
    price: '',

    ownership: 'self',
    ownerId: null,

    // Address
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    coordinates: {
      latitude: '',
      longitude: '',
    },

    // Details
    details: {
      bedrooms: 0,
      bathrooms: 0,
      area: '',
      parking: 0,
      yearBuilt: '',
      furnished: false,
    },

    // Features
    amenities: [],
    tags: [],

    // Media
    images: [],
    videos: [],

    // Availability
    status: 'Draft',
    availableFrom: '',
  });

  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState('');
  const [previewImages, setPreviewImages] = useState([]);

  const amenitiesList = [
    'Pool',
    'Gym',
    'Parking',
    'Elevator',
    'Balcony',
    'Garden',
    'Security',
    'AC',
    'Heating',
    'Pet-Friendly',
    'Laundry',
  ];

  const propertyTypes = ['Apartment', 'House', 'Condo', 'Commercial', 'Land'];
  const categories = ['Sale', 'Rent'];
  const statusOptions = ['Draft', 'Available', 'Under Review'];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        setProfile(response.data.user);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || '',
        description: property.description || '',
        type: property.type || 'Apartment',
        category: property.category || 'Rent',
        price: property.price?.toString() || '',
        address: {
          street: property.address?.street || '',
          city: property.address?.city || '',
          state: property.address?.state || '',
          zipCode: property.address?.zipCode || '',
          country: property.address?.country || 'USA',
        },
        coordinates: {
          latitude: property.coordinates?.latitude?.toString() || '',
          longitude: property.coordinates?.longitude?.toString() || '',
        },
        details: {
          bedrooms: property.details?.bedrooms || 0,
          bathrooms: property.details?.bathrooms || 0,
          area: property.details?.area?.toString() || '',
          parking: property.details?.parking || 0,
          yearBuilt: property.details?.yearBuilt?.toString() || '',
          furnished: property.details?.furnished || false,
        },
        amenities: property.amenities || [],
        tags: property.tags || [],
        images: property.images || [],
        videos: property.videos || [],
        status: property.status || 'Draft',
        availableFrom: property.availableFrom
          ? new Date(property.availableFrom).toISOString().split('T')[0]
          : '',
      });
      setPreviewImages(property.images || []);
    }
  }, [property]);

  const handleInputChange = (field, value, nested = null) => {
    if (nested) {
      setFormData((prev) => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error for this field
    if (errors[nested ? `${nested}.${field}` : field]) {
      setErrors((prev) => ({
        ...prev,
        [nested ? `${nested}.${field}` : field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.title?.trim()) {
      newErrors['title'] = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors['title'] = 'Title must be at least 5 characters';
    }

    if (!formData.description?.trim()) {
      newErrors['description'] = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors['description'] = 'Description must be at least 20 characters';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors['price'] = 'Valid price is required';
    }

    // Address validation
    if (!formData.address.street?.trim()) {
      newErrors['address.street'] = 'Street address is required';
    }
    if (!formData.address.city?.trim()) {
      newErrors['address.city'] = 'City is required';
    }
    if (!formData.address.state?.trim()) {
      newErrors['address.state'] = 'State is required';
    }
    if (!formData.address.zipCode?.trim()) {
      newErrors['address.zipCode'] = 'Zip code is required';
    }

    // Coordinates validation
    if (!formData.coordinates.latitude || !formData.coordinates.longitude) {
      newErrors['coordinates'] = 'Coordinates are required for map location';
    }

    // Details validation
    if (!formData.details.area || formData.details.area <= 0) {
      newErrors['details.area'] = 'Area is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const apiData = {
        ...formData,
        price: Number(formData.price),
        status: formData.status,
        coordinates: {
          latitude: Number(formData.coordinates.latitude),
          longitude: Number(formData.coordinates.longitude),
        },
        details: {
          ...formData.details,
          bedrooms: Number(formData.details.bedrooms),
          bathrooms: Number(formData.details.bathrooms),
          area: Number(formData.details.area),
          parking: Number(formData.details.parking),
          yearBuilt: formData.details.yearBuilt ? Number(formData.details.yearBuilt) : undefined,
        },
        availableFrom: formData.availableFrom || undefined,
        // Include ownerId if specified for agents
        ...(formData.ownership === 'client' && formData.ownerId && { ownerId: formData.ownerId }),
      };

      let response;
      if (property) {
        response = await propertyAPI.updateProperty(property._id, apiData);
        toast.success('Property updated successfully');
      } else {
        response = await propertyAPI.createProperty(apiData);
        toast.success('Property created successfully');
      }

      onClose(true); // true indicates success/refresh needed
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error.message || 'Failed to save property';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage = {
            url: e.target.result,
            caption: file.name,
            isPrimary: previewImages.length === 0,
          };
          setPreviewImages((prev) => [...prev, newImage]);
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, newImage],
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const setPrimaryImage = (index) => {
    const updatedImages = previewImages.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    setPreviewImages(updatedImages);
    setFormData((prev) => ({
      ...prev,
      images: updatedImages,
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Home },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'details', label: 'Details', icon: Square },
    { id: 'features', label: 'Features', icon: Tag },
    { id: 'media', label: 'Media', icon: Camera },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter property title..."
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the property..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {profile?.role === 'Agent' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Ownership
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ownership"
                      value="self"
                      checked={formData.ownership === 'self'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ownership: e.target.value,
                          ownerId: null,
                        }))
                      }
                      className="mr-2"
                    />
                    Creating property for myself
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ownership"
                      value="client"
                      checked={formData.ownership === 'client'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ownership: e.target.value,
                        }))
                      }
                      className="mr-2"
                    />
                    Creating property for a client
                  </label>
                </div>

                {formData.ownership === 'client' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Email or ID
                    </label>
                    <input
                      type="text"
                      value={formData.ownerId || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ownerId: e.target.value,
                        }))
                      }
                      placeholder="Enter client's user ID or email"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      For {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price ({formData.category === 'Rent' ? 'per month' : 'total'}) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className={`w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available From
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="date"
                    value={formData.availableFrom}
                    onChange={(e) => handleInputChange('availableFrom', e.target.value)}
                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => handleInputChange('street', e.target.value, 'address')}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['address.street'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter street address..."
              />
              {errors['address.street'] && (
                <p className="text-red-500 text-sm mt-1">{errors['address.street']}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('city', e.target.value, 'address')}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['address.city'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="City"
                />
                {errors['address.city'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['address.city']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('state', e.target.value, 'address')}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['address.state'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="State"
                />
                {errors['address.state'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['address.state']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code *</label>
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value, 'address')}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['address.zipCode'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="12345"
                />
                {errors['address.zipCode'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['address.zipCode']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('country', e.target.value, 'address')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="USA"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Map Coordinates *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={formData.coordinates.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value, 'coordinates')}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.coordinates ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Latitude (e.g., 40.7128)"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={formData.coordinates.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value, 'coordinates')}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.coordinates ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Longitude (e.g., -74.0060)"
                  />
                </div>
              </div>
              {errors.coordinates && (
                <p className="text-red-500 text-sm mt-1">{errors.coordinates}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Use Google Maps to find exact coordinates. Right-click on the location and select
                "What's here?"
              </p>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bed className="inline w-4 h-4 mr-1" />
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={formData.details.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', e.target.value, 'details')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bath className="inline w-4 h-4 mr-1" />
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.details.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value, 'details')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Square className="inline w-4 h-4 mr-1" />
                  Area (sq ft) *
                </label>
                <input
                  type="number"
                  value={formData.details.area}
                  onChange={(e) => handleInputChange('area', e.target.value, 'details')}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['details.area'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="0"
                />
                {errors['details.area'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['details.area']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Car className="inline w-4 h-4 mr-1" />
                  Parking Spots
                </label>
                <input
                  type="number"
                  value={formData.details.parking}
                  onChange={(e) => handleInputChange('parking', e.target.value, 'details')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year Built</label>
                <input
                  type="number"
                  value={formData.details.yearBuilt}
                  onChange={(e) => handleInputChange('yearBuilt', e.target.value, 'details')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder="e.g., 2020"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3 mt-6">
                  <input
                    type="checkbox"
                    checked={formData.details.furnished}
                    onChange={(e) => handleInputChange('furnished', e.target.checked, 'details')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Furnished</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Amenities</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {amenitiesList.map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {/* FIXED: Use div instead of form to avoid nested forms */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Property Images
              </label>

              {/* Image Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Camera className="h-12 w-12 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload images or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</span>
                </label>
              </div>

              {/* Image Preview */}
              {previewImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                  {previewImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={image.caption}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />

                      {/* Primary badge */}
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}

                      {/* Image actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {!image.isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(index)}
                            className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                            title="Set as primary image"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Videos (Optional)
              </label>
              <div className="space-y-3">
                {formData.videos.map((video, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="url"
                      value={video.url}
                      onChange={(e) => {
                        const updatedVideos = [...formData.videos];
                        updatedVideos[index].url = e.target.value;
                        setFormData((prev) => ({ ...prev, videos: updatedVideos }));
                      }}
                      placeholder="Video URL (YouTube, Vimeo, etc.)"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) => {
                        const updatedVideos = [...formData.videos];
                        updatedVideos[index].title = e.target.value;
                        setFormData((prev) => ({ ...prev, videos: updatedVideos }));
                      }}
                      placeholder="Video title"
                      className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedVideos = formData.videos.filter((_, i) => i !== index);
                        setFormData((prev) => ({ ...prev, videos: updatedVideos }));
                      }}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      videos: [...prev.videos, { url: '', title: '' }],
                    }));
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Video
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {property ? 'Edit Property' : 'Create New Property'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">{renderTabContent()}</div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {Object.keys(errors).length > 0 && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">
                    Please fix {Object.keys(errors).length} error
                    {Object.keys(errors).length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {property ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {property ? 'Update Property' : 'Create Property'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
