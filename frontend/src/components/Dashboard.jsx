import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { useEffect } from 'react';
import { UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../services/cropImage';
import Header from './Header';

import {
  Building,
  Heart,
  Eye,
  TrendingUp,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Home,
  Phone,
  Info,
  Search,
  Bell,
  HelpCircle,
  Camera,
  Key,
  Edit3,
  X,
  EyeOff,
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentApplicationSubmitted, setAgentApplicationSubmitted] = useState(false);
  const [settingsModal, setSettingsModal] = useState({ isOpen: false, type: null });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [usernameForm, setUsernameForm] = useState({
    newUsername: '',
    isLoading: false,
    error: null,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        setProfile(response?.data?.user || null); // <-- extract user object
      } catch (err) {
        console.error('Failed to fetch profile:', err.message);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      const response = await authAPI.getAgentApplicationStatus();
      setAgentApplicationSubmitted(response?.data?.submitted || false);
    };
    fetchAgentStatus();
  }, []);

  const stats = [
    {
      title: 'Total Properties',
      value: '12',
      change: '+2 this month',
      icon: Building,
      color: 'bg-blue-500',
    },
    {
      title: 'Favorites',
      value: '24',
      change: '+5 this week',
      icon: Heart,
      color: 'bg-red-500',
    },
    {
      title: 'Property Views',
      value: '1,234',
      change: '+12% this month',
      icon: Eye,
      color: 'bg-green-500',
    },
    {
      title: 'Saved Searches',
      value: '8',
      change: '2 new alerts',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  const recentProperties = [
    {
      id: 1,
      title: 'Modern Downtown Apartment',
      price: '$450,000',
      location: 'Manhattan, NY',
      image:
        'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'Active',
    },
    {
      id: 2,
      title: 'Luxury Villa with Pool',
      price: '$850,000',
      location: 'Beverly Hills, CA',
      image:
        'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'Pending',
    },
    {
      id: 3,
      title: 'Cozy Family Home',
      price: '$320,000',
      location: 'Austin, TX',
      image:
        'https://images.pexels.com/photos/1438832/pexels-photo-1438832.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'Sold',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      action: 'New inquiry received',
      property: 'Modern Downtown Apartment',
      time: '2 hours ago',
      icon: Users,
    },
    {
      id: 2,
      action: 'Property view',
      property: 'Luxury Villa with Pool',
      time: '4 hours ago',
      icon: Eye,
    },
    {
      id: 3,
      action: 'Price updated',
      property: 'Cozy Family Home',
      time: '1 day ago',
      icon: DollarSign,
    },
    {
      id: 4,
      action: 'Showing scheduled',
      property: 'Modern Downtown Apartment',
      time: '2 days ago',
      icon: Calendar,
    },
  ];

  const getMenuItemsByRole = (role) => {
    switch (role) {
      case 'Admin':
        return [
          { icon: Home, label: 'Dashboard', active: true },
          { icon: Users, label: 'Manage Users', active: false },
          { icon: Building, label: 'All Properties', active: false },
        ];
      case 'Agent':
        return [
          { icon: Home, label: 'Dashboard', active: true },
          { icon: Building, label: 'My Listings', active: false },
          { icon: Calendar, label: 'Appointments', active: false },
        ];
      case 'Owner':
        return [
          { icon: Home, label: 'Dashboard', active: true },
          { icon: Building, label: 'My Properties', active: false },
        ];
      case 'Tenant':
        return [
          { icon: Home, label: 'Dashboard', active: true },
          { icon: Heart, label: 'Favorites', active: false },
          { icon: Search, label: 'Search Properties', active: false },
        ];
      default:
        return [
          { icon: Home, label: 'Dashboard', active: true },
          { icon: Search, label: 'Search Properties', active: false },
        ];
    }
  };

  const menuItems = getMenuItemsByRole(profile?.role);

  // Only include "Change Password" if not a Google user
  const settingsItems = [
    { icon: Camera, label: 'Change Profile Picture', key: 'profile' },
    { icon: Edit3, label: 'Change Username', key: 'username' },
    // Only add this if not a Google user
    ...(!profile?.googleId ? [{ icon: Key, label: 'Change Password', key: 'password' }] : []),
  ];

  const openSettingsModal = (type) => {
    setSettingsModal({ isOpen: true, type });
    setSidebarOpen(false);

    // Reset form states when opening modals
    if (type === 'username') {
      setUsernameForm({
        newUsername: '',
        isLoading: false,
        error: null,
      });
    } else if (type === 'password') {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        isLoading: false,
        error: null,
      });
    }
  };

  const closeSettingsModal = () => {
    setSettingsModal({ isOpen: false, type: null });
  };

  const handleProfileSave = async () => {
    if (!avatarFile || !avatarPreview) return;

    const croppedImageBlob = await getCroppedImg(avatarPreview, croppedAreaPixels);
    const formData = new FormData();
    formData.append('avatar', croppedImageBlob, avatarFile.name);

    try {
      const response = await authAPI.updateProfile(formData);

      // Check if response has the updated user data
      if (response?.data?.user) {
        setProfile(response.data.user);
      } else {
        // Fallback: refetch profile if response doesn't include user data
        const profileResponse = await authAPI.getProfile();
        setProfile(profileResponse?.data?.user || null);
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      closeSettingsModal();
    } catch (err) {
      console.error('Failed to update profile picture:', err);
    }
  };

  const handleUsernameChange = async () => {
    if (!usernameForm.newUsername.trim()) {
      setUsernameForm((prev) => ({ ...prev, error: 'Username is required' }));
      return;
    }

    if (usernameForm.newUsername.length < 3 || usernameForm.newUsername.length > 30) {
      setUsernameForm((prev) => ({ ...prev, error: 'Username must be 3-30 characters long' }));
      return;
    }

    setUsernameForm((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authAPI.updateUsername(usernameForm.newUsername);

      if (response.success) {
        setProfile((prev) => ({ ...prev, name: usernameForm.newUsername }));
        closeSettingsModal();
      } else {
        throw new Error(response.message || 'Failed to update username');
      }
    } catch (err) {
      console.error('Failed to update username:', err);
      setUsernameForm((prev) => ({
        ...prev,
        error: err.message || 'Failed to update username',
      }));
    } finally {
      setUsernameForm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordForm((prev) => ({ ...prev, error: 'All fields are required' }));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordForm((prev) => ({
        ...prev,
        error: 'New password must be at least 8 characters long',
      }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordForm((prev) => ({ ...prev, error: 'New passwords do not match' }));
      return;
    }

    setPasswordForm((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authAPI.updatePassword(currentPassword, newPassword);

      if (response.success) {
        closeSettingsModal();
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordForm((prev) => ({
        ...prev,
        error: err.message || 'Failed to change password',
      }));
    } finally {
      setPasswordForm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const getModalTitle = () => {
    switch (settingsModal.type) {
      case 'profile':
        return 'Change Profile Picture';
      case 'username':
        return 'Change Username';
      case 'password':
        return 'Change Password';
      default:
        return 'Settings';
    }
  };

  const getModalAction = () => {
    switch (settingsModal.type) {
      case 'profile':
        return handleProfileSave;
      case 'username':
        return handleUsernameChange;
      case 'password':
        return handlePasswordChange;
      default:
        return () => {};
    }
  };

  const isModalActionDisabled = () => {
    switch (settingsModal.type) {
      case 'profile':
        return !avatarFile || !avatarPreview;
      case 'username':
        return usernameForm.isLoading || !usernameForm.newUsername.trim();
      case 'password':
        return (
          passwordForm.isLoading ||
          !passwordForm.currentPassword ||
          !passwordForm.newPassword ||
          !passwordForm.confirmPassword
        );
      default:
        return false;
    }
  };

  const renderModalContent = () => {
    switch (settingsModal.type) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 overflow-hidden relative">
                {avatarPreview ? (
                  <Cropper
                    image={avatarPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(croppedArea, croppedAreaPixels) => {
                      setCroppedAreaPixels(croppedAreaPixels);
                    }}
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <p className="text-sm text-gray-600 text-center mb-4">
                Choose a new profile picture. Recommended size: 400x400px
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload new picture
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setAvatarFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setAvatarPreview(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'username':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Username
              </label>
              <input
                type="text"
                value={profile?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Username</label>
              <input
                type="text"
                placeholder="Enter new username"
                value={usernameForm.newUsername}
                onChange={(e) =>
                  setUsernameForm((prev) => ({ ...prev, newUsername: e.target.value, error: null }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                disabled={usernameForm.isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Username must be 3-30 characters long.</p>
              {usernameForm.error && (
                <p className="mt-1 text-xs text-red-600">{usernameForm.error}</p>
              )}
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                      error: null,
                    }))
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  disabled={passwordForm.isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                      error: null,
                    }))
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  disabled={passwordForm.isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                      error: null,
                    }))
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  disabled={passwordForm.isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long.
              </p>
              {passwordForm.error && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.error}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
        <>
          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {/* Sidebar */}
          <div
            className={`
  fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:z-40
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          >
            <div className="flex flex-col h-full">
              {/* Profile Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {profile && profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.name || 'Profile'}
                        className="w-12 h-12 object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {profile ? profile.name : '...'}
                    </h3>
                    <p className="text-xs text-gray-500">{profile ? profile.role : ''}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Main Menu
                  </h4>
                  {menuItems.map((item, index) => (
                    <a
                      key={index}
                      href="#"
                      className={`
                        flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          item.active
                            ? 'bg-slate-900 text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </a>
                  ))}

                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!agentApplicationSubmitted) {
                        navigate('/agent-application');
                      }
                    }}
                    className={`
    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
    ${
      false // You can add an 'active' state if needed
        ? 'bg-slate-900 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }
  `}
                  >
                    <UserCheck className="w-5 h-5 mr-3" />
                    Agent Status
                    {agentApplicationSubmitted && <span className="ml-2 text-green-500">✔</span>}
                  </a>
                </div>

                {/* Settings Section */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Account Settings
                  </h4>
                  {settingsItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => openSettingsModal(item.key)}
                      className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  ))}

                  <a
                    href="#"
                    className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <HelpCircle className="w-5 h-5 mr-3" />
                    Help & Support
                  </a>
                </div>
              </nav>
            </div>
          </div>
        </>

        <div
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}
        >
          <div className="p-6 space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg p-6 text-white">
              <h1 className="text-2xl font-bold mb-2">
                Welcome, {profile && profile.name ? profile.name : '...'}!
              </h1>
              <p className="text-slate-200">Here's what's happening with your properties today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <div className="flex items-center">
                      <div className={`${stat.color} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-green-600">{stat.change}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Properties */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Properties</h2>
                </div>
                <div className="p-6 space-y-4">
                  {recentProperties.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {property.image ? (
                        <img
                          src={property.image}
                          alt={property.title}
                          className="w-8 h-8 object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{property.title}</h3>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {property.location}
                        </p>
                        <p className="text-lg font-semibold text-slate-900 mt-1">
                          {property.price}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          property.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : property.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {property.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="p-6 space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="bg-slate-100 p-2 rounded-lg">
                          <Icon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-600">{activity.property}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <Building className="w-6 h-6 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Add Property</span>
                </button>
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <Heart className="w-6 h-6 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">View Favorites</span>
                </button>
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <TrendingUp className="w-6 h-6 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Analytics</span>
                </button>
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <Calendar className="w-6 h-6 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Schedule Tour</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{getModalTitle()}</h2>
              <button
                onClick={closeSettingsModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">{renderModalContent()}</div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeSettingsModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={usernameForm.isLoading || passwordForm.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={getModalAction()}
                disabled={isModalActionDisabled()}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {(usernameForm.isLoading || passwordForm.isLoading) && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                {usernameForm.isLoading || passwordForm.isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
