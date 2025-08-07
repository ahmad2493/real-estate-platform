import React, { useState, useEffect } from 'react';
import {
  Users,
  Check,
  X,
  Eye,
  Filter,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  Mail,
  Phone,
  FileText,
  Menu,
  Trash2,
  UserX,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import Header from './Header';
import Sidebar from './Sidebar';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionUser, setActionUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updating, setUpdating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Add profile state for Sidebar
  const [profile, setProfile] = useState(null);
  const [hasAgentApplication, setHasAgentApplication] = useState(false);
  const [agentApplicationStatus, setAgentApplicationStatus] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchProfile(); // Fetch profile for Sidebar
  }, []);

  // Add profile fetch function for Sidebar
  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfile(response?.data?.user || null);
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
    }
  };

  // Add agent status fetch for Sidebar
  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const response = await authAPI.getAgentApplicationStatus();
        console.log('Agent status response:', response);

        const statusData = response?.data || {};
        setAgentApplicationStatus(statusData.status);
        
        const isSubmitted = statusData.submitted || false;
        setHasAgentApplication(isSubmitted);
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
        setHasAgentApplication(false);
        setAgentApplicationStatus(null);
      }
    };

    fetchAgentStatus();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getAllUsers();
      console.log('API Response:', response); // Debug log

      // Handle different response structures
      const usersData = response.data?.users || response.data || response || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError('Failed to fetch users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      setUpdating(true);
      const response = await authAPI.suspendUser(userId);
      console.log('Suspend response:', response);

      // Update local state
      setUsers((prev) =>
        prev.map((user) => 
          user._id === userId ? { ...user, status: 'Suspended', isActive: false } : user
        )
      );

      toast.success('User suspended successfully');
      setShowConfirmModal(false);
      setActionUser(null);
    } catch (err) {
      console.error('Suspend user error:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to suspend user';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleReactivateUser = async (userId) => {
    try {
      setUpdating(true);
      const response = await authAPI.reactivateUser(userId);
      console.log('Reactivate response:', response);

      // Update local state
      setUsers((prev) =>
        prev.map((user) => 
          user._id === userId ? { ...user, status: 'Active', isActive: true } : user
        )
      );

      toast.success('User reactivated successfully');
      setShowConfirmModal(false);
      setActionUser(null);
    } catch (err) {
      console.error('Reactivate user error:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to reactivate user';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setUpdating(true);
      const response = await authAPI.deleteUser(userId);
      console.log('Delete response:', response);

      // Remove user from local state
      setUsers((prev) => prev.filter((user) => user._id !== userId));

      toast.success('User deleted successfully');
      setShowConfirmModal(false);
      setActionUser(null);
    } catch (err) {
      console.error('Delete user error:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const openConfirmModal = (user, action) => {
    setActionUser(user);
    setActionType(action);
    setShowConfirmModal(true);
  };

  const openDetailsModal = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  // Add settings modal handler for Sidebar (placeholder function)
  const openSettingsModal = (type) => {
    // This should be implemented based on your requirements
    console.log('Opening settings modal:', type);
  };

  const getDisplayStatus = (user) => {
    if (user.status === 'Suspended' || user.isActive === false) {
      return 'suspended';
    }
    return 'active';
  };

  const getStatusBadge = (user) => {
    const displayStatus = getDisplayStatus(user);

    const statusConfig = {
      active: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Active',
      },
      suspended: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircle,
        label: 'Suspended',
      },
    };

    const config = statusConfig[displayStatus] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      Admin: 'bg-purple-100 text-purple-800',
      Agent: 'bg-blue-100 text-blue-800',
      User: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || roleColors.User}`}>
        {role}
      </span>
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase());

    const displayStatus = getDisplayStatus(user);
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchUsers}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
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
          {/* Main content area with proper spacing */}
          <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center mb-2">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
              </div>
              <p className="text-gray-600">Review and manage user accounts</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Users', value: users.length, color: 'blue' },
                {
                  label: 'Active Users',
                  value: users.filter((u) => getDisplayStatus(u) === 'active').length,
                  color: 'green',
                },
                {
                  label: 'Suspended',
                  value: users.filter((u) => getDisplayStatus(u) === 'suspended').length,
                  color: 'red',
                },
                {
                  label: 'Agents',
                  value: users.filter((u) => u.role === 'Agent').length,
                  color: 'purple',
                },
              ].map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                      <Users className={`h-6 w-6 text-${stat.color}-600`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="User">Users</option>
                      <option value="Agent">Agents</option>
                      <option value="Owner">Owners</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Active
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {user.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(user.role)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openDetailsModal(user)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              
                              {getDisplayStatus(user) === 'active' && user.role !== 'Admin' && (
                                <button
                                  onClick={() => openConfirmModal(user, 'suspend')}
                                  className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                                  title="Suspend User"
                                  disabled={updating}
                                >
                                  <UserX className="h-4 w-4" />
                                </button>
                              )}
                              
                              {getDisplayStatus(user) === 'suspended' && (
                                <button
                                  onClick={() => openConfirmModal(user, 'reactivate')}
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                  title="Reactivate User"
                                  disabled={updating}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              
                              {user.role !== 'Admin' && (
                                <button
                                  onClick={() => openConfirmModal(user, 'delete')}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                  title="Delete User"
                                  disabled={updating}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-xl">
                    {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedUser)}
                    {getRoleBadge(selectedUser.role)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Role</p>
                      <p className="text-sm text-gray-600">{selectedUser.role}</p>
                    </div>
                  </div>

                  {selectedUser.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{selectedUser.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Account Status</p>
                    <p className="text-sm text-gray-600">
                      {getDisplayStatus(selectedUser) === 'active' ? 'Active' : 'Suspended'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Email Verified</p>
                    <p className="text-sm text-gray-600">
                      {selectedUser.isEmailVerified ? 'Yes' : 'No'}
                    </p>
                  </div>

                  {selectedUser.address && (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Address</p>
                      <p className="text-sm text-gray-600">{selectedUser.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-500">
                <div>
                  <p className="font-medium">Joined:</p>
                  <p>
                    {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Last Login:</p>
                  <p>
                    {selectedUser.lastLogin
                      ? new Date(selectedUser.lastLogin).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {selectedUser.role !== 'Admin' && (
              <div className="p-6 border-t border-gray-200 flex space-x-3">
                {getDisplayStatus(selectedUser) === 'active' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openConfirmModal(selectedUser, 'suspend');
                    }}
                    className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors flex items-center justify-center"
                    disabled={updating}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Suspend User
                  </button>
                )}
                
                {getDisplayStatus(selectedUser) === 'suspended' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openConfirmModal(selectedUser, 'reactivate');
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate User
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openConfirmModal(selectedUser, 'delete');
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                  disabled={updating}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && actionUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                {actionType === 'suspend' && <UserX className="h-8 w-8 text-yellow-600 mr-3" />}
                {actionType === 'reactivate' && <CheckCircle className="h-8 w-8 text-green-600 mr-3" />}
                {actionType === 'delete' && <Trash2 className="h-8 w-8 text-red-600 mr-3" />}
                <h3 className="text-lg font-medium text-gray-900">
                  {actionType === 'suspend' && 'Suspend User'}
                  {actionType === 'reactivate' && 'Reactivate User'}
                  {actionType === 'delete' && 'Delete User'}
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to {actionType} <span className="font-semibold">{actionUser.name}</span>?
                {actionType === 'suspend' && ' They will not be able to access their account.'}
                {actionType === 'reactivate' && ' They will regain access to their account.'}
                {actionType === 'delete' && ' This action cannot be undone and all their data will be permanently removed.'}
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionType === 'suspend') {
                      handleSuspendUser(actionUser._id);
                    } else if (actionType === 'reactivate') {
                      handleReactivateUser(actionUser._id);
                    } else if (actionType === 'delete') {
                      handleDeleteUser(actionUser._id);
                    }
                  }}
                  className={`flex-1 px-4 py-2 rounded-md text-white transition-colors flex items-center justify-center ${
                    actionType === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    actionType === 'reactivate' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={updating}
                >
                  {updating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  {actionType === 'suspend' && 'Suspend'}
                  {actionType === 'reactivate' && 'Reactivate'}
                  {actionType === 'delete' && 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;