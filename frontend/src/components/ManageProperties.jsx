import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Map,
  Calendar,
  DollarSign,
  Home,
  Tag,
  Camera,
  Video,
  MapPin,
  Menu,
  Grid,
  List,
  Star,
  Heart,
  Share2,
  MoreVertical,
  Bed,
  Bath,
  Square,
  Car,
  X,
  ChevronDown,
  CheckSquare,
  Square as UncheckedSquare,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { propertyAPI } from '../services/api';
import { authAPI } from '../services/api';
import Header from './Header';
import Sidebar from './Sidebar';
import PropertyForm from './PropertyForm';

// Debounce hook for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const ManageProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [hasAgentApplication, setHasAgentApplication] = useState(false);
  const [agentApplicationStatus, setAgentApplicationStatus] = useState(null);

  // Search state (separate from debounced value)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchTerm = useDebounce(searchInput, 500); // 500ms delay

  // Enhanced Filters and Search
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    status: 'all',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    city: '',
    state: '',
    zipCode: '',
    amenities: [],
    tags: [],
    propertyCategory: 'all', // residential, commercial, etc.
    datePosted: 'all', // today, week, month, all
    featured: false,
    minArea: '',
    maxArea: '',
    parking: '',
    furnished: 'all',
    petFriendly: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Available amenities for filtering
  const availableAmenities = [
    'Swimming Pool',
    'Gym',
    'Parking',
    'Garden',
    'Balcony',
    'Air Conditioning',
    'Heating',
    'Elevator',
    'Security',
    'Internet',
    'Furnished',
    'Pet Friendly',
    'Laundry',
    'Dishwasher',
    'Fireplace',
    'Walk-in Closet',
  ];

  // Available tags/categories
  const availableTags = [
    'Luxury',
    'Budget Friendly',
    'Family Home',
    'Student Housing',
    'Senior Living',
    'New Construction',
    'Historic',
    'Waterfront',
    'City View',
    'Mountain View',
    'Quiet Neighborhood',
    'Near Transit',
    'Shopping Nearby',
    'School District',
    'Investment Property',
  ];

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProperties: 0,
    limit: 12,
  });

  useEffect(() => {
    fetchProperties();
    fetchProfile();
    fetchAgentStatus();
  }, [pagination.currentPage, filters, debouncedSearchTerm]); // Use debounced search term

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfile(response?.data?.user || null);
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
    }
  };

  const fetchAgentStatus = async () => {
    try {
      const response = await authAPI.getAgentApplicationStatus();
      const statusData = response?.data || {};
      setAgentApplicationStatus(statusData.status);
      setHasAgentApplication(statusData.submitted || false);
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
      setHasAgentApplication(false);
      setAgentApplicationStatus(null);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);

      if (!profile) {
        setLoading(false);
        return;
      }

      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        search: debouncedSearchTerm,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => {
            if (key === 'amenities' || key === 'tags') {
              return value.length > 0;
            }
            return value && value !== 'all' && value !== '' && value !== false;
          })
        ),
      };

      if (
        (profile.role === 'Tenant' || profile.role === 'Visitor') &&
        (!params.status || params.status === 'all')
      ) {
        params.status = 'Available';
      }

      // Convert array filters to comma-separated strings
      if (params.amenities) {
        params.amenities = params.amenities.join(',');
      }
      if (params.tags) {
        params.tags = params.tags.join(',');
      }

      // Convert boolean filters
      if (params.featured) {
        params.featured = true;
      }

      let response;

      // Use different API endpoints based on user role
      if (profile?.role === 'Admin' || profile?.role === 'Tenant' || profile?.role === 'Visitor') {
        response = await propertyAPI.getAllProperties(params);
      } else {
        // For Owner, Agent, or other roles - fetch only their properties
        response = await propertyAPI.getMyProperties(params);
      }

      const data = response.data;

      setProperties(data.properties || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Fetch properties error:', err);
      setError('Failed to fetch properties');
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await propertyAPI.deleteProperty(propertyId);
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedProperty(null);
    setShowForm(true);
  };

  const handleFormClose = (shouldRefresh = false) => {
    setShowForm(false);
    setSelectedProperty(null);
    if (shouldRefresh) {
      fetchProperties();
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleTagToggle = (tag) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      category: 'all',
      status: 'all',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      city: '',
      state: '',
      zipCode: '',
      amenities: [],
      tags: [],
      propertyCategory: 'all',
      datePosted: 'all',
      featured: false,
      minArea: '',
      maxArea: '',
      parking: '',
      furnished: 'all',
      petFriendly: 'all',
    });
    setSearchInput('');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
      Rented: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Rented' },
      Sold: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Sold' },
      'Under Review': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Review' },
      Draft: { bg: 'bg-red-100', text: 'text-red-800', label: 'Draft' },
    };

    const config = statusConfig[status] || statusConfig.Draft;
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const PropertyCard = ({ property }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-48">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images.find((img) => img.isPrimary)?.url || property.images[0]?.url}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Building2 className="h-16 w-16 text-gray-400" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {getStatusBadge(property.status)}
          {property.featured && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 flex gap-1">
          {profile?.role !== 'Tenant' && profile?.role !== 'Visitor' && (
            <>
              <button
                onClick={() => handleEdit(property)}
                className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                title="Edit Property"
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
              {(profile?.role === 'Owner' || profile?.role === 'Admin') && (
                <button
                  onClick={() => handleDelete(property._id)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="Delete Property"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{property.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{property.description}</p>
        </div>

        <div className="flex items-center text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">
            {property.address.city}, {property.address.state}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-3">
            {property.details.bedrooms > 0 && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.details.bedrooms}</span>
              </div>
            )}
            {property.details.bathrooms > 0 && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.details.bathrooms}</span>
              </div>
            )}
            {property.details.area > 0 && (
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.details.area} sq ft</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">Views: {property.viewCount || 0}</div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">{formatPrice(property.price)}</span>
            <span className="text-sm text-gray-600 ml-1">
              {property.category === 'Rent' ? '/month' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                property.type === 'House'
                  ? 'bg-blue-100 text-blue-800'
                  : property.type === 'Apartment'
                    ? 'bg-green-100 text-green-800'
                    : property.type === 'Condo'
                      ? 'bg-purple-100 text-purple-800'
                      : property.type === 'Commercial'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
              }`}
            >
              {property.type}
            </span>
          </div>
        </div>

        {/* Tags */}
        {property.tags && property.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {property.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {property.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{property.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Admin/Owner info */}
        {profile?.role === 'Admin' && property.owner && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <span>
                Owner: {property.owner.firstName} {property.owner.lastName}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const PropertyListItem = ({ property }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-6">
        {/* Image */}
        <div className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images.find((img) => img.isPrimary)?.url || property.images[0]?.url}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Building2 className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{property.title}</h3>
              <p className="text-gray-600 mt-1 line-clamp-2">{property.description}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {getStatusBadge(property.status)}
              {property.featured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center text-sm text-gray-600 mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {property.address.street}, {property.address.city}, {property.address.state}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              {property.details.bedrooms > 0 && (
                <div className="flex items-center">
                  <Bed className="h-4 w-4 mr-1" />
                  <span>
                    {property.details.bedrooms} bed{property.details.bedrooms !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {property.details.bathrooms > 0 && (
                <div className="flex items-center">
                  <Bath className="h-4 w-4 mr-1" />
                  <span>
                    {property.details.bathrooms} bath{property.details.bathrooms !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {property.details.area > 0 && (
                <div className="flex items-center">
                  <Square className="h-4 w-4 mr-1" />
                  <span>{property.details.area} sq ft</span>
                </div>
              )}
              <div className="flex items-center">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    property.type === 'House'
                      ? 'bg-blue-100 text-blue-800'
                      : property.type === 'Apartment'
                        ? 'bg-green-100 text-green-800'
                        : property.type === 'Condo'
                          ? 'bg-purple-100 text-purple-800'
                          : property.type === 'Commercial'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {property.type}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(property.price)}
                  {property.category === 'Rent' && (
                    <span className="text-sm text-gray-600">/month</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">Views: {property.viewCount || 0}</div>
              </div>

              {profile?.role !== 'Tenant' && profile?.role !== 'Visitor' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleEdit(property)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Property"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {(profile?.role === 'Owner' || profile?.role === 'Admin') && (
                    <button
                      onClick={() => handleDelete(property._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Property"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {property.tags && property.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {property.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Admin/Owner info */}
          {profile?.role === 'Admin' && property.owner && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center text-xs text-gray-500">
                <span>
                  Owner: {property.owner.firstName} {property.owner.lastName}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const openSettingsModal = (type) => {
    console.log('Opening settings modal:', type);
  };

  if (loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        leftComponent={
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
        }
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          profile={profile}
          hasAgentApplication={hasAgentApplication}
          agentApplicationStatus={agentApplicationStatus}
          openSettingsModal={openSettingsModal}
        />

        <div
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}
        >
          {/* Main content */}
          <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center mb-2">
                  <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile?.role === 'Admin'
                      ? 'All Properties'
                      : profile?.role === 'Tenant' || profile?.role === 'Visitor'
                        ? 'Search Properties'
                        : 'My Properties'}
                  </h1>
                </div>
                <p className="text-gray-600">
                  {profile?.role === 'Admin'
                    ? 'Manage all property listings in the system'
                    : profile?.role === 'Tenant' || profile?.role === 'Visitor' || !profile?.role
                      ? 'Search properties based on variety of filters'
                      : 'Manage your property listings'}
                </p>
              </div>
              {profile?.role !== 'Tenant' && profile?.role !== 'Visitor' && (
                <button
                  onClick={handleCreate}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Property
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {profile?.role === 'Tenant' || profile?.role === 'Visitor'
                ? // For Tenants and Visitors - only show Total Properties
                  [
                    { label: 'Total Properties', value: pagination.totalProperties, color: 'blue' },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                          <Building2 className={`h-6 w-6 text-${stat.color}-600`} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                      </div>
                    </div>
                  ))
                : // For other roles (Admin, Owner, Agent) - show all stats
                  [
                    { label: 'Total Properties', value: pagination.totalProperties, color: 'blue' },
                    {
                      label: 'Available',
                      value: properties.filter((p) => p.status === 'Available').length,
                      color: 'green',
                    },
                    {
                      label: 'Rented/Sold',
                      value: properties.filter((p) => ['Rented', 'Sold'].includes(p.status)).length,
                      color: 'purple',
                    },
                    {
                      label: 'Draft',
                      value: properties.filter((p) => p.status === 'Draft').length,
                      color: 'red',
                    },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                          <Building2 className={`h-6 w-6 text-${stat.color}-600`} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>

            {/* Enhanced Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search properties by title, description, location..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchInput && (
                      <button
                        onClick={() => setSearchInput('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      showFilters
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="h-5 w-5" />
                    Advanced Filters
                    <ChevronDown
                      className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Grid className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'list'
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <List className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Filters Panel */}
              {showFilters && (
                <div className="border-t border-gray-200 pt-6">
                  {/* Basic Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Type
                      </label>
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Types</option>
                        <option value="Apartment">Apartment</option>
                        <option value="House">House</option>
                        <option value="Condo">Condo</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Land">Land</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Studio">Studio</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Categories</option>
                        <option value="Sale">For Sale</option>
                        <option value="Rent">For Rent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Category
                      </label>
                      <select
                        value={filters.propertyCategory}
                        onChange={(e) => handleFilterChange('propertyCategory', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Categories</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="mixed-use">Mixed Use</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="Available">Available</option>
                        <option value="Rented">Rented</option>
                        <option value="Sold">Sold</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  {/* Location Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="Enter city"
                        value={filters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="Enter state"
                        value={filters.state}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        placeholder="Enter zip code"
                        value={filters.zipCode}
                        onChange={(e) => handleFilterChange('zipCode', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Price and Size Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Price ($)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Price ($)
                      </label>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Area (sq ft)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.minArea}
                        onChange={(e) => handleFilterChange('minArea', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Area (sq ft)
                      </label>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={filters.maxArea}
                        onChange={(e) => handleFilterChange('maxArea', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Room and Feature Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bedrooms
                      </label>
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Any</option>
                        <option value="0">Studio</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bathrooms
                      </label>
                      <select
                        value={filters.bathrooms}
                        onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Any</option>
                        <option value="1">1+</option>
                        <option value="1.5">1.5+</option>
                        <option value="2">2+</option>
                        <option value="2.5">2.5+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parking
                      </label>
                      <select
                        value={filters.parking}
                        onChange={(e) => handleFilterChange('parking', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Any</option>
                        <option value="0">No Parking</option>
                        <option value="1">1+ Space</option>
                        <option value="2">2+ Spaces</option>
                        <option value="3">3+ Spaces</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Furnished
                      </label>
                      <select
                        value={filters.furnished}
                        onChange={(e) => handleFilterChange('furnished', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Any</option>
                        <option value="yes">Furnished</option>
                        <option value="no">Unfurnished</option>
                        <option value="partial">Partially Furnished</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pet Friendly
                      </label>
                      <select
                        value={filters.petFriendly}
                        onChange={(e) => handleFilterChange('petFriendly', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Any</option>
                        <option value="yes">Pet Friendly</option>
                        <option value="no">No Pets</option>
                      </select>
                    </div>
                  </div>

                  {/* Date and Special Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Posted
                      </label>
                      <select
                        value={filters.datePosted}
                        onChange={(e) => handleFilterChange('datePosted', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Any Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="3months">Last 3 Months</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        <input
                          type="checkbox"
                          checked={filters.featured}
                          onChange={(e) => handleFilterChange('featured', e.target.checked)}
                          className="mr-2 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                        />
                        Featured Properties Only
                      </label>
                    </div>
                  </div>

                  {/* Amenities Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Amenities
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {availableAmenities.map((amenity) => (
                        <button
                          key={amenity}
                          onClick={() => handleAmenityToggle(amenity)}
                          className={`flex items-center p-2 rounded-lg text-sm transition-colors ${
                            filters.amenities.includes(amenity)
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {filters.amenities.includes(amenity) ? (
                            <CheckSquare className="h-4 w-4 mr-2" />
                          ) : (
                            <UncheckedSquare className="h-4 w-4 mr-2" />
                          )}
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tags & Categories
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`flex items-center p-2 rounded-lg text-sm transition-colors ${
                            filters.tags.includes(tag)
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {filters.tags.includes(tag) ? (
                            <CheckSquare className="h-4 w-4 mr-2" />
                          ) : (
                            <UncheckedSquare className="h-4 w-4 mr-2" />
                          )}
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {
                        Object.values(filters).filter(
                          (v) =>
                            (Array.isArray(v) && v.length > 0) ||
                            (typeof v === 'string' && v !== '' && v !== 'all') ||
                            (typeof v === 'boolean' && v)
                        ).length
                      }{' '}
                      active filters
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Clear All Filters
                      </button>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Properties Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={fetchProperties}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!error && properties.length === 0 && !loading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
                <p className="text-gray-600 mb-6">
                  {searchInput ||
                  Object.values(filters).some(
                    (f) =>
                      (Array.isArray(f) && f.length > 0) ||
                      (typeof f === 'string' && f !== '' && f !== 'all') ||
                      (typeof f === 'boolean' && f)
                  )
                    ? 'No properties match your current search and filters.'
                    : profile?.role === 'Admin'
                      ? 'No properties found in the system.'
                      : 'Start by creating your first property listing.'}
                </p>
                <div className="flex justify-center gap-4">
                  {(searchInput ||
                    Object.values(filters).some(
                      (f) =>
                        (Array.isArray(f) && f.length > 0) ||
                        (typeof f === 'string' && f !== '' && f !== 'all') ||
                        (typeof f === 'boolean' && f)
                    )) && (
                    <button
                      onClick={clearFilters}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                  {profile?.role !== 'Tenant' && profile?.role !== 'Visitor' && (
                    <button
                      onClick={handleCreate}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Add Property
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Properties Grid/List */}
                <div
                  className={`${
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-4'
                  }`}
                >
                  {properties.map((property) =>
                    viewMode === 'grid' ? (
                      <PropertyCard key={property._id} property={property} />
                    ) : (
                      <PropertyListItem key={property._id} property={property} />
                    )
                  )}
                </div>

                {/* Loading indicator for pagination */}
                {loading && properties.length > 0 && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing{' '}
                        <span className="font-medium">
                          {(pagination.currentPage - 1) * pagination.limit + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(
                            pagination.currentPage * pagination.limit,
                            pagination.totalProperties
                          )}
                        </span>{' '}
                        of <span className="font-medium">{pagination.totalProperties}</span> results
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              currentPage: Math.max(1, prev.currentPage - 1),
                            }))
                          }
                          disabled={!pagination.hasPrevPage}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center space-x-1">
                          {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                            const pageNumber = Math.max(
                              1,
                              Math.min(
                                pagination.currentPage - 2 + index,
                                pagination.totalPages - 4 + index
                              )
                            );

                            if (pageNumber > pagination.totalPages) return null;

                            return (
                              <button
                                key={pageNumber}
                                onClick={() =>
                                  setPagination((prev) => ({
                                    ...prev,
                                    currentPage: pageNumber,
                                  }))
                                }
                                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                  pageNumber === pagination.currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              currentPage: Math.min(prev.totalPages, prev.currentPage + 1),
                            }))
                          }
                          disabled={!pagination.hasNextPage}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Property Form Modal */}
      {showForm && <PropertyForm property={selectedProperty} onClose={handleFormClose} />}
    </div>
  );
};

export default ManageProperties;
