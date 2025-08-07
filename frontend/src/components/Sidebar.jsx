import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  profile,
  hasAgentApplication,
  agentApplicationStatus,
  openSettingsModal
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const shouldShowAgentStatus = () => {
    // Rule 1: If user is already an approved Agent, always show
    if (profile?.role === 'Agent') {
      return true;
    }

    // Rule 2: If user has submitted an agent application (any status), show it
    if (hasAgentApplication) {
      return true;
    }

    // Rule 3: If user's intended role is Agent, show it
    if (profile?.intendedRole === 'Agent') {
      return true;
    }

    // Rule 4: For all other cases, don't show
    return false;
  };

  const getMenuItemsByRole = (role) => {
    switch (role) {
      case 'Admin':
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard' },
          { icon: Users, label: 'Manage Users', path: '/manage-users' },
          { icon: User, label: 'Manage Agents', path: '/manage-agents' },
          { icon: Building, label: 'All Properties', path: '/all-properties' },
        ];
      case 'Agent':
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard' },
          { icon: Building, label: 'My Listings', path: '/my-listings' },
          { icon: Calendar, label: 'Appointments', path: '/appointments' },
        ];
      case 'Owner':
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard' },
          { icon: Building, label: 'My Properties', path: '/my-properties' },
        ];
      case 'Tenant':
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard' },
          { icon: Heart, label: 'Favorites', path: '/favorites' },
          { icon: Search, label: 'Search Properties', path: '/search' },
        ];
      default:
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard' },
          { icon: Search, label: 'Search Properties', path: '/search' },
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

  const handleNavigation = (path) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleAgentStatusClick = (e) => {
    e.preventDefault();
    // Only navigate to application if they're not an approved agent
    if (profile?.role !== 'Agent') {
      navigate('/agent-application');
      // Close sidebar on mobile after navigation
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
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
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Main Menu
              </h4>

              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                    ${
                      isActive(item.path)
                        ? 'bg-slate-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              
              {shouldShowAgentStatus() && (
                <button
                  onClick={handleAgentStatusClick}
                  className={`
                    flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                    ${
                      profile?.role === 'Agent'
                        ? 'text-gray-500 cursor-default'
                        : location.pathname === '/agent-application'
                        ? 'bg-slate-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
                    }
                  `}
                  disabled={profile?.role === 'Agent'}
                >
                  <User className="w-5 h-5 mr-3" />
                  <span className="flex-1">Agent Status</span>
                  {/* Show different status badges based on agent application status */}
                  {agentApplicationStatus === 'approved' && (
                    <span className="ml-2 text-green-500 font-medium text-xs">Approved</span>
                  )}
                  {agentApplicationStatus === 'suspended' && (
                    <span className="ml-2 text-yellow-500 font-medium text-xs">Suspended</span>
                  )}
                  {agentApplicationStatus === 'rejected' && (
                    <span className="ml-2 text-red-500 font-medium text-xs">Rejected</span>
                  )}
                  {agentApplicationStatus === 'pending' && (
                    <span className="ml-2 text-blue-500 font-medium text-xs">Pending</span>
                  )}
                </button>
              )}
            </div>

            {/* Settings Section */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Account Settings
              </h4>
              {settingsItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    openSettingsModal(item.key);
                    // Close sidebar on mobile after opening modal
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-left"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}

              <button
                className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-left"
                onClick={() => {
                  // Handle help & support click
                  console.log('Help & Support clicked');
                  // Close sidebar on mobile
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <HelpCircle className="w-5 h-5 mr-3" />
                Help & Support
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;