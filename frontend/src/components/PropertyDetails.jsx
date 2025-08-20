import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square,
  Car,
  Calendar,
  Tag,
  Heart,
  Share2,
  Eye,
  Phone,
  Mail,
  User,
  Building2,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  FileText,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { propertyAPI, authAPI, leaseAPI } from '../services/api';
import Header from './Header';
import PropertyMap from './PropertyMap';

const PropertyDetails = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [leaseRequest, setLeaseRequest] = useState({
    startDate: '',
    endDate: '',
    message: '',
    terms: false,
  });
  const [submittingLease, setSubmittingLease] = useState(false);
  const isAnyModalOpen = () => {
    return showImageModal || showTourModal || showContactModal || showLeaseModal;
  };
  useEffect(() => {
    fetchProperty();
    fetchProfile();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await propertyAPI.getPropertyById(propertyId);
      setProperty(response.data.property);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Failed to load property details');
      toast.error('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfile(response.data.user);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleLeaseRequest = async () => {
    if (!leaseRequest.startDate || !leaseRequest.endDate || !leaseRequest.terms) {
      toast.error('Please fill all required fields and accept terms');
      return;
    }

    // Validate date range
    const startDate = new Date(leaseRequest.startDate);
    const endDate = new Date(leaseRequest.endDate);
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      setSubmittingLease(true);
      // Use leaseAPI instead of propertyAPI for lease requests
      await leaseAPI.requestLease({
        propertyId,
        terms: {
          startDate: leaseRequest.startDate,
          endDate: leaseRequest.endDate,
          monthlyRent: property.price, // or leaseRequest.monthlyRent if you allow editing
          securityDeposit: property.price, // or leaseRequest.securityDeposit
          renewalOption: false,
        },
        message: leaseRequest.message,
      });

      toast.success('Lease request submitted successfully!');
      setShowLeaseModal(false);
      setLeaseRequest({
        startDate: '',
        endDate: '',
        message: '',
        terms: false,
      });
    } catch (err) {
      console.error('Error submitting lease request:', err);
      toast.error(err.response?.data?.message || 'Failed to submit lease request');
    } finally {
      setSubmittingLease(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
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
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  // Safe property access helpers
  const getPropertyImages = () => property?.images || [];
  const getPropertyAmenities = () => property?.amenities || [];
  const getPropertyTags = () => property?.tags || [];

  const hasValidCoordinates = () => {
    return property?.coordinates?.latitude && property?.coordinates?.longitude;
  };

  // Get contact person info (prioritize agent over owner)
  const getContactInfo = () => {
    if (property?.agent) {
      return {
        name: property.agent.user?.name || 'Agent',
        email: property.agent.user?.email,
        phone: property.agent.phone,
        type: 'Listing Agent',
      };
    }

    if (property?.owner) {
      return {
        name: property.owner.name || 'Owner',
        email: property.owner.email,
        phone: property.owner.phone,
        type: 'Property Owner',
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-800 mb-2">Property Not Found</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/manage-properties')}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Properties
            </button>
          </div>
        </div>
      </div>
    );
  }

  const images = getPropertyImages();
  const amenities = getPropertyAmenities();
  const tags = getPropertyTags();
  const contactInfo = getContactInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/manage-properties')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Properties
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {images.length > 0 ? (
                <div className="relative">
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    <img
                      src={images[currentImageIndex]?.url}
                      alt={property.title}
                      className="w-full h-96 object-cover cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                    />
                  </div>

                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === 0 ? images.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === images.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Image Indicators */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {getStatusBadge(property.status)}
                    {property.featured && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <Star className="w-4 h-4 mr-1" />
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                      <Heart className="h-5 w-5 text-gray-600" />
                    </button>
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                      <Share2 className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                  <Building2 className="h-24 w-24 text-gray-400" />
                </div>
              )}

              {/* Thumbnail Grid */}
              {images.length > 1 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="grid grid-cols-6 gap-2">
                    {images.slice(0, 5).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                          index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={`View ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <button
                        onClick={() => setShowImageModal(true)}
                        className="aspect-square rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <span className="text-xs font-medium">+{images.length - 5}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    {property.address && (
                      <div className="flex items-center text-gray-600 mb-4">
                        <MapPin className="h-5 w-5 mr-2" />
                        <span className="text-lg">
                          {property.address.street}, {property.address.city},{' '}
                          {property.address.state}, {property.address.country}{' '}
                          {property.address.zipCode}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-blue-600 mb-1">
                      {formatPrice(property.price)}
                      {property.category === 'Rent' && (
                        <span className="text-xl text-gray-600">/month</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      <Eye className="inline h-4 w-4 mr-1" />
                      {property.viewCount || 0} views
                    </div>
                  </div>
                </div>

                {/* Property Stats */}
                {property.details && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Bed className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {property.details.bedrooms || 0}
                      </div>
                      <div className="text-sm text-gray-600">Bedrooms</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Bath className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {property.details.bathrooms || 0}
                      </div>
                      <div className="text-sm text-gray-600">Bathrooms</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Square className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {property.details.area || 0}
                      </div>
                      <div className="text-sm text-gray-600">Sq Ft</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Car className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {property.details.parking || 0}
                      </div>
                      <div className="text-sm text-gray-600">Parking</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Description</h2>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>
              )}

              {/* Property Details */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Property Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Property Type</span>
                      <span className="font-medium text-gray-900">{property.type}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Category</span>
                      <span className="font-medium text-gray-900">For {property.category}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Year Built</span>
                      <span className="font-medium text-gray-900">
                        {property.details?.yearBuilt || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Available From</span>
                      <span className="font-medium text-gray-900">
                        {property.availableFrom ? formatDate(property.availableFrom) : 'Immediate'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Posted On</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(property.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Furnished</span>
                      <span className="font-medium text-gray-900">
                        {property.details?.furnished ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <Check className="h-5 w-5 text-blue-600 mr-3" />
                        <span className="text-gray-700">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-700"
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Map */}
              {hasValidCoordinates() && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Location</h2>
                  <div
                    className={`rounded-lg overflow-hidden border border-gray-200 ${
                      isAnyModalOpen() ? 'hidden' : 'block'
                    }`}
                  >
                    <PropertyMap
                      coordinates={{
                        latitude: property.coordinates.latitude,
                        longitude: property.coordinates.longitude,
                      }}
                      height="300px"
                      editable={false}
                      showMarker={true}
                    />
                  </div>
                  {property.address && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center text-gray-700">
                        <MapPin className="h-5 w-5 mr-2" />
                        <span>
                          {property.address.street}, {property.address.city},{' '}
                          {property.address.state}, {property.address.country}{' '}
                          {property.address.zipCode}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* 3D Tour Button */}
              {property.virtualTourUrl && (
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-4">3D Virtual Tour</h1>
                  <button
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-medium"
                    onClick={() => setShowTourModal(true)}
                  >
                    View 3D Tour
                  </button>
                </div>
              )}

              {/* Videos & Virtual Tour */}
              {((property.videos && property.videos.length > 0) || property.virtualTourUrl) && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Media</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.videos &&
                      property.videos.map((video, index) => (
                        <a
                          key={index}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors shadow-sm border border-blue-100 mb-2"
                          style={{ textDecoration: 'none' }}
                        >
                          <ExternalLink className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-800 text-base">
                            {video.title || `Video ${index + 1}`}
                          </span>
                          <span className="ml-auto text-sm text-blue-500 font-semibold">
                            Watch Video
                          </span>
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-16">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {formatPrice(property.price)}
                  {property.category === 'Rent' && (
                    <span className="text-lg text-gray-600">/month</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {property.category === 'Rent' ? 'Monthly Rent' : 'Purchase Price'}
                </div>
              </div>

              {/* Contact Information */}
              {contactInfo && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span className="text-xs">{contactInfo.type}</span>
                    </div>
                    <div className="font-medium text-gray-900">{contactInfo.name}</div>
                    {contactInfo.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="text-sm">{contactInfo.email}</span>
                      </div>
                    )}
                    {contactInfo.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <span className="text-sm">{contactInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Lease Request Button - Only for Tenants on Available Rent Properties */}
                {profile?.role === 'Tenant' &&
                  property.category === 'Rent' &&
                  property.status === 'Available' && (
                    <button
                      onClick={() => setShowLeaseModal(true)}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <FileText className="h-5 w-5" />
                      Request Lease
                    </button>
                  )}

                {contactInfo && (
                  <>
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <Phone className="h-5 w-5" />
                      Contact {contactInfo.type === 'Listing Agent' ? 'Agent' : 'Owner'}
                    </button>
                  </>
                )}

                <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium">
                  <Heart className="h-5 w-5" />
                  Save Property
                </button>
              </div>

              {/* Property Type Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    property.type === 'House'
                      ? 'bg-blue-100 text-blue-800'
                      : property.type === 'Apartment'
                        ? 'bg-green-100 text-green-800'
                        : property.type === 'Condo'
                          ? 'bg-purple-100 text-purple-800'
                          : property.type === 'Commercial'
                            ? 'bg-orange-100 text-orange-800'
                            : property.type === 'Land'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {property.type}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={images[currentImageIndex]?.url}
              alt={property.title}
              className="max-w-full max-h-full object-contain"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                  }
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      {/* Virtual Tour Modal */}
      {showTourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowTourModal(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold mb-4">3D Virtual Tour</h2>
            <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden border">
              <iframe
                src={property.virtualTourUrl}
                width="100%"
                height="480"
                style={{ border: 'none' }}
                allow="fullscreen; vr"
                allowFullScreen
                title="3D Virtual Tour"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && contactInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Contact Information</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">{contactInfo.type}</span>
                </div>
                <div className="text-gray-700">
                  <div className="font-medium text-lg">{contactInfo.name}</div>
                  {contactInfo.email && (
                    <div className="flex items-center mt-2 text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="text-sm">{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo.phone && (
                    <div className="flex items-center mt-1 text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="text-sm">{contactInfo.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Contact Actions */}
              <div className="space-y-2">
                {contactInfo.phone && (
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Phone className="h-4 w-4" />
                    Call Now
                  </a>
                )}
                {contactInfo.email && (
                  <a
                    href={`mailto:${contactInfo.email}?subject=${encodeURIComponent(`Inquiry about ${property.title}`)}`}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lease Request Modal */}
      {showLeaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Request Lease</h2>
              <button
                onClick={() => setShowLeaseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Property Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-1">{property.title}</h3>
                {property.address && (
                  <p className="text-sm text-blue-700">
                    {property.address.city}, {property.address.state}
                  </p>
                )}
                <p className="text-lg font-bold text-blue-800 mt-2">
                  {formatPrice(property.price)}/month
                </p>
              </div>

              {/* Lease Details Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lease Start Date *
                    </label>
                    <input
                      type="date"
                      value={leaseRequest.startDate}
                      onChange={(e) =>
                        setLeaseRequest((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lease End Date *
                    </label>
                    <input
                      type="date"
                      value={leaseRequest.endDate}
                      onChange={(e) =>
                        setLeaseRequest((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={leaseRequest.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Message (Optional)
                  </label>
                  <textarea
                    value={leaseRequest.message}
                    onChange={(e) =>
                      setLeaseRequest((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional information or requests..."
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="lease-terms"
                      checked={leaseRequest.terms}
                      onChange={(e) =>
                        setLeaseRequest((prev) => ({
                          ...prev,
                          terms: e.target.checked,
                        }))
                      }
                      className="mt-1 mr-3 h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="lease-terms" className="text-sm text-gray-700">
                      I agree to the terms and conditions and understand that this is a formal lease
                      request that will be processed by the property owner/agent.
                    </label>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaseModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaseRequest}
                    disabled={
                      submittingLease ||
                      !leaseRequest.startDate ||
                      !leaseRequest.endDate ||
                      !leaseRequest.terms
                    }
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingLease ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;
