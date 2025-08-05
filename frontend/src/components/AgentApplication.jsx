import { useState, useEffect } from 'react';
import { Menu, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Header from './Header';
import { authAPI } from '../services/api';

// Constants
const VALIDATION_RULES = {
  LICENSE_NUMBER: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9]{6,20}$/,
  },
  AGENCY_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  PHONE: {
    PATTERN: /^[\+]?[1-9][\d]{0,15}$/,
  },
  URL: {
    PATTERN: /^https?:\/\/.+\..+/,
  },
};

const SPECIALIZATION_OPTIONS = [
  'Residential',
  'Commercial',
  'Luxury',
  'Investment',
  'First-Time Buyers',
  'Rentals',
];

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-20 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-2 z-50`}
    >
      <Icon className="h-5 w-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
        ×
      </button>
    </div>
  );
}

function AgentApplication() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    licenseNumber: '',
    agencyName: '',
    agencyAddress: '',
    agencyPhone: '',
    agencyWebsite: '',
    specializations: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Utility Functions
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const sanitizeInput = (input) => {
    return input.replace(/[<>]/g, '');
  };

  const validateLicenseNumber = (license) => {
    if (!license) return 'License number is required';
    if (license.length < VALIDATION_RULES.LICENSE_NUMBER.MIN_LENGTH)
      return `License number must be at least ${VALIDATION_RULES.LICENSE_NUMBER.MIN_LENGTH} characters`;
    if (license.length > VALIDATION_RULES.LICENSE_NUMBER.MAX_LENGTH)
      return `License number must be no more than ${VALIDATION_RULES.LICENSE_NUMBER.MAX_LENGTH} characters`;
    if (!VALIDATION_RULES.LICENSE_NUMBER.PATTERN.test(license))
      return 'License number must contain only letters and numbers';
    return null;
  };

  const validateAgencyName = (name) => {
    if (!name) return 'Agency name is required';
    if (name.length < VALIDATION_RULES.AGENCY_NAME.MIN_LENGTH)
      return `Agency name must be at least ${VALIDATION_RULES.AGENCY_NAME.MIN_LENGTH} characters`;
    if (name.length > VALIDATION_RULES.AGENCY_NAME.MAX_LENGTH)
      return `Agency name must be no more than ${VALIDATION_RULES.AGENCY_NAME.MAX_LENGTH} characters`;
    return null;
  };

  const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required';
    if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) return 'Please enter a valid phone number';
    return null;
  };

  const validateWebsite = (website) => {
    if (website && !VALIDATION_RULES.URL.PATTERN.test(website)) {
      return 'Please enter a valid website URL (must start with http:// or https://)';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate all fields
    const licenseError = validateLicenseNumber(formData.licenseNumber);
    if (licenseError) newErrors.licenseNumber = licenseError;

    const nameError = validateAgencyName(formData.agencyName);
    if (nameError) newErrors.agencyName = nameError;

    const phoneError = validatePhone(formData.agencyPhone);
    if (phoneError) newErrors.agencyPhone = phoneError;

    const websiteError = validateWebsite(formData.agencyWebsite);
    if (websiteError) newErrors.agencyWebsite = websiteError;

    if (!formData.agencyAddress) {
      newErrors.agencyAddress = 'Agency address is required';
    }

    if (formData.specializations.length === 0) {
      newErrors.specializations = 'Please select at least one specialization';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);

    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSpecializationChange = (specialization) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter((s) => s !== specialization)
        : [...prev.specializations, specialization],
    }));

    if (errors.specializations) {
      setErrors((prev) => ({
        ...prev,
        specializations: '',
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authAPI.submitAgentApplication(formData);

      if (result.status !== 200 && result.status !== 201) {
        showToast(result.message || 'Failed to submit application', 'error');
        return;
      }

      showToast(
        'Application submitted successfully! Our team will review it shortly.',
        'success'
      );

      // Reset form
      setFormData({
        licenseNumber: '',
        agencyName: '',
        agencyAddress: '',
        agencyPhone: '',
        agencyWebsite: '',
        specializations: [],
      });

      // Optional: Navigate to dashboard after successful submission
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Submission error:', error);
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <Header
        leftComponent={
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-gray-300" />
          </button>
        }
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-slate-800 rounded-xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Join Our Agent Network</h1>
          <p className="text-slate-300 text-lg">
            Partner with Estatify and grow your real estate business
          </p>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Agent Application</h2>
            <p className="text-gray-600">
              You may also apply later from the status bar. Until your application is submitted,
              your role will remain as Visitor.
            </p>
          </div>

          <fieldset disabled={isSubmitting} className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="licenseNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  License Number *
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.licenseNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your license number (6-20 alphanumeric)"
                  aria-describedby={errors.licenseNumber ? 'licenseNumber-error' : undefined}
                />
                {errors.licenseNumber && (
                  <p id="licenseNumber-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.licenseNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="agencyName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Agency Name *
                </label>
                <input
                  type="text"
                  id="agencyName"
                  name="agencyName"
                  value={formData.agencyName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.agencyName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your agency name (3-100 characters)"
                  aria-describedby={errors.agencyName ? 'agencyName-error' : undefined}
                />
                {errors.agencyName && (
                  <p id="agencyName-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.agencyName}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="agencyPhone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Agency Phone *
                </label>
                <input
                  type="tel"
                  id="agencyPhone"
                  name="agencyPhone"
                  value={formData.agencyPhone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.agencyPhone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your agency phone number"
                  aria-describedby={errors.agencyPhone ? 'agencyPhone-error' : undefined}
                />
                {errors.agencyPhone && (
                  <p id="agencyPhone-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.agencyPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3 */}
            <div>
              <label
                htmlFor="agencyWebsite"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Agency Website
              </label>
              <input
                type="url"
                id="agencyWebsite"
                name="agencyWebsite"
                value={formData.agencyWebsite}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.agencyWebsite ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="https://www.yourwebsite.com (optional)"
                aria-describedby={errors.agencyWebsite ? 'agencyWebsite-error' : undefined}
              />
              {errors.agencyWebsite && (
                <p id="agencyWebsite-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.agencyWebsite}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="agencyAddress"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Agency Address *
              </label>
              <textarea
                id="agencyAddress"
                name="agencyAddress"
                value={formData.agencyAddress}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.agencyAddress ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your agency address"
                aria-describedby={errors.agencyAddress ? 'agencyAddress-error' : undefined}
              />
              {errors.agencyAddress && (
                <p id="agencyAddress-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.agencyAddress}
                </p>
              )}
            </div>

            {/* Specializations */}
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-4">
                  Specializations *
                </legend>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {SPECIALIZATION_OPTIONS.map((specialization) => (
                    <div key={specialization} className="flex items-center">
                      <input
                        type="checkbox"
                        id={specialization}
                        checked={formData.specializations.includes(specialization)}
                        onChange={() => handleSpecializationChange(specialization)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      <label htmlFor={specialization} className="ml-3 text-sm text-gray-700">
                        {specialization}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.specializations && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {errors.specializations}
                  </p>
                )}
              </fieldset>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className={`w-full md:w-auto px-8 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            </div>
          </fieldset>
        </div>
      </main>
    </div>
  );
}

export default AgentApplication;
