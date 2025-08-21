import React, { useState, useEffect, useRef } from 'react';
import { authAPI, notificationAPI, leaseAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../services/cropImage';
import Header from './Header';
import Sidebar from './Sidebar';
import { toast } from 'react-toastify';

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
  Upload,
  FileText,
  Check,
  Clock,
  AlertCircle,
  Download,
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
  const [hasAgentApplication, setHasAgentApplication] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [agentApplicationStatus, setAgentApplicationStatus] = useState(null);

  const [isCreatingDocuSignSession, setIsCreatingDocuSignSession] = useState(false);
  const [docusignSigningUrl, setDocusignSigningUrl] = useState(null);

  const [showSigningModal, setShowSigningModal] = useState(false);
  const [signingDocument, setSigningDocument] = useState(null);
  const [isSigningDocument, setIsSigningDocument] = useState(false);
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const fileInputRef = useRef(null);

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
    const checkSuspendedUser = () => {
      const isSuspended = localStorage.getItem('suspendedUser');
      if (isSuspended && window.location.pathname !== '/suspended') {
        window.location.href = '/suspended';
      }
    };

    checkSuspendedUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        setProfile(response?.data?.user || null);
      } catch (err) {
        console.error('Failed to fetch profile:', err.message);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const response = await authAPI.getAgentApplicationStatus();
        console.log('Agent status response:', response);

        const statusData = response?.data || {};
        setAgentApplicationStatus(statusData.status);

        const isSubmitted = statusData.submitted || false;
        setAgentApplicationSubmitted(isSubmitted);
        setHasAgentApplication(isSubmitted);
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
        setAgentApplicationSubmitted(false);
        setHasAgentApplication(false);
        setAgentApplicationStatus(null);
      }
    };

    fetchAgentStatus();
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const [notificationsResponse, countResponse] = await Promise.all([
          notificationAPI.getNotifications(),
          notificationAPI.getUnreadCount(),
        ]);

        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.notifications || []);
        }

        if (countResponse.success) {
          setUnreadCount(countResponse.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    if (profile) {
      fetchNotifications();
    }
  }, [profile]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const signedLeaseId = urlParams.get('signed');

    if (signedLeaseId) {
      // Check if the lease was signed successfully
      checkDocuSignStatus(signedLeaseId);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle notification actions
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) => (notif._id === notificationId ? { ...notif, isRead: true } : notif))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleUploadDocument = (notification) => {
    setSelectedNotification(notification);
    setShowUploadModal(true);
    // Mark as read when opened
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedNotification) return;

    try {
      setUploadingDocument(true);
      const response = await leaseAPI.uploadLeaseDocument(selectedNotification.lease._id, file);

      if (response.success) {
        toast.success('Lease document uploaded successfully!');
        setShowUploadModal(false);
        setSelectedNotification(null);

        // Refresh notifications to update status
        const notificationsResponse = await notificationAPI.getNotifications();
        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.notifications || []);
        }
      } else {
        toast.error(response.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDocument(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LeaseRequest':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'LeaseUploaded':
        return <Upload className="h-5 w-5 text-green-600" />;
      case 'LeaseRequiresSignature':
        return <Edit3 className="h-5 w-5 text-orange-600" />;
      case 'LeaseSigned':
        return <Check className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMilliseconds = now - notificationDate;
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return notificationDate.toLocaleDateString();
  };

  const handleSignDocument = (notification) => {
    setSigningDocument(notification);
    setShowSigningModal(true);
    // Mark as read when opened
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
  };

  // Add this function to process the actual signing
  const processDocumentSigning = async () => {
    if (!signingDocument) return;

    try {
      setIsSigningDocument(true);
      const response = await leaseAPI.signLeaseDocument(signingDocument.lease._id);

      if (response.success) {
        toast.success('Document signed successfully!');
        setShowSigningModal(false);
        setSigningDocument(null);

        // Refresh notifications to update status
        const notificationsResponse = await notificationAPI.getNotifications();
        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.notifications || []);
        }
      } else {
        toast.error(response.message || 'Failed to sign document');
      }
    } catch (error) {
      console.error('Signing error:', error);
      toast.error('Failed to sign document');
    } finally {
      setIsSigningDocument(false);
    }
  };

  // Add this function to download/view document
  const handleViewDocument = async (documentUrl) => {
    try {
      window.open(documentUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDocuSignSigning = async (notification) => {
    try {
      setIsCreatingDocuSignSession(true);

      const response = await leaseAPI.createDocuSignEnvelope(notification.lease._id);

      if (response.success) {
        // Open DocuSign signing session in a new window/tab
        window.open(response.signingUrl, '_blank');

        // Mark notification as read
        if (!notification.isRead) {
          handleMarkAsRead(notification._id);
        }

        toast.success('DocuSign signing session opened in new tab');

        // Optionally check status periodically
        checkDocuSignStatus(notification.lease._id);
      } else {
        toast.error(response.message || 'Failed to create DocuSign session');
      }
    } catch (error) {
      console.error('DocuSign signing error:', error);
      toast.error('Failed to create DocuSign signing session');
    } finally {
      setIsCreatingDocuSignSession(false);
    }
  };

  // Add function to check DocuSign status
  const checkDocuSignStatus = async (leaseId) => {
    try {
      const response = await leaseAPI.checkDocuSignStatus(leaseId);

      if (response.success) {
        console.log('DocuSign status:', response.status);

        if (response.status === 'completed') {
          toast.success('Document has been signed successfully!');

          // Refresh notifications to update status
          const notificationsResponse = await notificationAPI.getNotifications();
          if (notificationsResponse.success) {
            setNotifications(notificationsResponse.notifications || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check DocuSign status:', error);
    }
  };

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
      title: 'Unread Notifications',
      value: unreadCount.toString(),
      change: 'New activities',
      icon: Bell,
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

      if (response?.data?.user) {
        setProfile(response.data.user);
      } else {
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
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          profile={profile}
          hasAgentApplication={hasAgentApplication}
          agentApplicationStatus={agentApplicationStatus}
          openSettingsModal={openSettingsModal}
        />

        {/* Main Content */}
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
                      <div className={`p-3 rounded-lg ${stat.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-sm text-gray-500">{stat.change}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real Notifications */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 rounded-lg border transition-colors ${
                            notification.isRead
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}
                              >
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(notification.createdAt)}
                              </p>

                              {/* Lease Request Details */}
                              {notification.type === 'LeaseRequest' &&
                                notification.lease &&
                                notification.lease.terms && (
                                  <div className="mt-2 text-xs text-blue-700">
                                    <div>
                                      <span className="font-semibold">Duration:</span>{' '}
                                      {new Date(
                                        notification.lease.terms.startDate
                                      ).toLocaleDateString()}{' '}
                                      -{' '}
                                      {new Date(
                                        notification.lease.terms.endDate
                                      ).toLocaleDateString()}
                                    </div>
                                    <div>
                                      <span className="font-semibold">Monthly Rent:</span> $
                                      {notification.lease.terms.monthlyRent}
                                    </div>
                                  </div>
                                )}

                              {/* Action buttons for different notification types */}
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {/* Lease Request Actions (for agents/owners) */}
                                {notification.type === 'LeaseRequest' &&
                                  notification.lease &&
                                  notification.lease.status !== 'document_uploaded' && (
                                    <button
                                      onClick={() => handleUploadDocument(notification)}
                                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                    >
                                      <Upload className="h-3 w-3" />
                                      Upload Lease
                                    </button>
                                  )}

                                {/* Document Uploaded Actions (for tenants) */}
                                {/* In the notifications mapping section, update the LeaseUploaded actions */}
                                {notification.type === 'LeaseUploaded' &&
                                  notification.metadata?.leaseDocumentUrl && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleViewDocument(notification.metadata.leaseDocumentUrl)
                                        }
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View Document
                                      </button>

                                      {/* NEW: DocuSign signing button */}
                                      <button
                                        onClick={() => handleDocuSignSigning(notification)}
                                        disabled={isCreatingDocuSignSession}
                                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-1"
                                      >
                                        {isCreatingDocuSignSession ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-white"></div>
                                            Creating...
                                          </>
                                        ) : (
                                          <>
                                            <Edit3 className="h-3 w-3" />
                                            Sign with DocuSign
                                          </>
                                        )}
                                      </button>

                                      {/* Fallback: Simple signature option */}
                                      <button
                                        onClick={() => handleSignDocument(notification)}
                                        className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                        Simple Sign
                                      </button>
                                    </>
                                  )}

                                {/* Similarly update LeaseRequiresSignature actions */}
                                {notification.type === 'LeaseRequiresSignature' &&
                                  notification.metadata?.leaseDocumentUrl && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleViewDocument(notification.metadata.leaseDocumentUrl)
                                        }
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View Document
                                      </button>

                                      {/* NEW: DocuSign signing button */}
                                      <button
                                        onClick={() => handleDocuSignSigning(notification)}
                                        disabled={isCreatingDocuSignSession}
                                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-1"
                                      >
                                        {isCreatingDocuSignSession ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-white"></div>
                                            Creating...
                                          </>
                                        ) : (
                                          <>
                                            <Edit3 className="h-3 w-3" />
                                            Sign with DocuSign
                                          </>
                                        )}
                                      </button>

                                      {/* Fallback: Simple signature option */}
                                      <button
                                        onClick={() => handleSignDocument(notification)}
                                        className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                        Simple Sign
                                      </button>
                                    </>
                                  )}
                                {/* Document Signed - just view action */}
                                {notification.type === 'LeaseSigned' &&
                                  notification.metadata?.leaseDocumentUrl && (
                                    <button
                                      onClick={() =>
                                        handleViewDocument(notification.metadata.leaseDocumentUrl)
                                      }
                                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                                    >
                                      <Eye className="h-3 w-3" />
                                      View Signed Document
                                    </button>
                                  )}

                                {/* Mark as Read button for all unread notifications */}
                                {!notification.isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification._id)}
                                    className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Properties */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Properties</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentProperties.map((property) => (
                      <div key={property.id} className="flex items-center space-x-4">
                        <img
                          src={property.image}
                          alt={property.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {property.title}
                          </p>
                          <p className="text-sm text-gray-500">{property.location}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold text-green-600">
                              {property.price}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/search')}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Search className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Search Properties</span>
                </button>
                <button
                  onClick={() => navigate('/favorites')}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Heart className="h-8 w-8 text-red-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">View Favorites</span>
                </button>
                <button
                  onClick={() => openSettingsModal('profile')}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-8 w-8 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Account Settings</span>
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Help & Support</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Upload Lease Document</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Lease Request Details</h4>
                <p className="text-sm text-blue-700">{selectedNotification.message}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lease Document
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> lease document
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, or DOCX (MAX. 10MB)</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileUpload}
                        disabled={uploadingDocument}
                      />
                    </label>
                  </div>
                </div>

                {uploadingDocument && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Uploading document...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={uploadingDocument}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Signing Modal */}
      {showSigningModal && signingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Sign Lease Document</h3>
                <button
                  onClick={() => setShowSigningModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSigningDocument}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Document Ready for Signature</h4>
                <p className="text-sm text-blue-700">{signingDocument.message}</p>
              </div>

              {/* Document Preview/Link */}
              {signingDocument.metadata?.leaseDocumentUrl && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Lease Agreement</p>
                        <p className="text-sm text-gray-500">Ready for your signature</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDocument(signingDocument.metadata.leaseDocumentUrl)}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                  </div>
                </div>
              )}

              {/* Signing Agreement */}
              <div className="mb-6">
                <div className="flex items-start space-x-3">
                  <input type="checkbox" id="agreeToSign" className="mt-1" required />
                  <label htmlFor="agreeToSign" className="text-sm text-gray-700">
                    I have reviewed the lease document and agree to the terms and conditions. By
                    clicking "Sign Document", I am providing my electronic signature to this lease
                    agreement.
                  </label>
                </div>
              </div>

              {isSigningDocument && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Processing signature...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowSigningModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSigningDocument}
              >
                Cancel
              </button>
              <button
                onClick={processDocumentSigning}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isSigningDocument}
              >
                {isSigningDocument ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing...
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Sign Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{getModalTitle()}</h3>
                <button onClick={closeSettingsModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">{renderModalContent()}</div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={closeSettingsModal}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                disabled={
                  usernameForm.isLoading ||
                  passwordForm.isLoading ||
                  (settingsModal.type === 'profile' && avatarFile && avatarPreview)
                }
              >
                Cancel
              </button>
              <button
                onClick={getModalAction()}
                className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isModalActionDisabled()}
              >
                {usernameForm.isLoading || passwordForm.isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
