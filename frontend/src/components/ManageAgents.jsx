import React, { useState, useEffect } from 'react';
import {
  User,
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
} from 'lucide-react';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import Header from './Header';

const ManageAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionAgent, setActionAgent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getAllAgents();
      console.log('API Response:', response); // Debug log
      
      // Handle different response structures
      const agentsData = response.data?.agents || response.data || response || [];
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch (err) {
      console.error('Fetch agents error:', err);
      setError('Failed to fetch agent applications');
      toast.error('Failed to load agent applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (agentId, status) => {
    try {
      setUpdating(true);

      // Use the correct API call
      const approved = status === 'approved';
      const rejectionReason = status === 'rejected' ? 'Application rejected by admin' : null;

      console.log('Updating agent status:', { agentId, approved, rejectionReason }); // Debug log

      const response = await authAPI.approveAgent(agentId, approved, rejectionReason);
      console.log('Update response:', response); // Debug log

      // Update local state - map backend status to frontend display
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent._id === agentId) {
            return {
              ...agent,
              status: status === 'approved' ? 'Active' : 'Rejected',
              isVerified: status === 'approved',
              reviewedAt: new Date().toISOString(),
            };
          }
          return agent;
        })
      );

      toast.success(`Agent application ${status} successfully`);
      setShowConfirmModal(false);
      setActionAgent(null);
      
      // Optionally refresh data from server
      // await fetchAgents();
      
    } catch (err) {
      console.error('Status update error:', err);
      
      // Better error handling
      const errorMessage = err.response?.data?.message || err.message || `Failed to ${status} agent application`;
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const openConfirmModal = (agent, action) => {
    setActionAgent(agent);
    setActionType(action);
    setShowConfirmModal(true);
  };

  const openDetailsModal = (agent) => {
    setSelectedAgent(agent);
    setShowDetailsModal(true);
  };

  // Fixed status mapping logic
  const getDisplayStatus = (agent) => {
    // Direct status mapping
    if (agent.status === 'Active' && agent.isVerified) {
      return 'approved';
    } else if (agent.status === 'Rejected') {
      return 'rejected';
    } else {
      return 'pending'; // Default for pending applications
    }
  };

  const getStatusBadge = (agent) => {
    const displayStatus = getDisplayStatus(agent);

    const statusConfig = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: Clock,
        label: 'Pending',
      },
      approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Approved',
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircle,
        label: 'Rejected',
      },
    };

    const config = statusConfig[displayStatus] || statusConfig.pending;
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

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.specializations?.some((spec) => spec.toLowerCase().includes(searchTerm.toLowerCase()));

    const displayStatus = getDisplayStatus(agent);
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;

    return matchesSearch && matchesStatus;
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
          onClick={fetchAgents}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header should be at the top level */}
      <Header />

      {/* Main content area with proper spacing */}
      <main className="pt-4">
        {' '}
        {/* Add top padding to account for fixed header */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center mb-2">
              <User className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Manage Agents</h1>
            </div>
            <p className="text-gray-600">Review and manage agent applications</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Applications', value: agents.length, color: 'blue' },
              {
                label: 'Pending',
                value: agents.filter((a) => getDisplayStatus(a) === 'pending').length,
                color: 'yellow',
              },
              {
                label: 'Approved',
                value: agents.filter((a) => getDisplayStatus(a) === 'approved').length,
                color: 'green',
              },
              {
                label: 'Rejected',
                value: agents.filter((a) => getDisplayStatus(a) === 'rejected').length,
                color: 'red',
              },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                    <User className={`h-6 w-6 text-${stat.color}-600`} />
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
                    placeholder="Search by name, email, license number, agency, or specializations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Agents Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No agent applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License & Agency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specializations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAgents.map((agent) => (
                      <tr key={agent._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {agent.name?.charAt(0).toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                              <div className="text-sm text-gray-500">{agent.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {agent.licenseNumber || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{agent.agency?.name || 'N/A'}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {agent.specializations?.slice(0, 2).map((spec, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {spec}
                              </span>
                            )) || <span className="text-gray-500 text-sm">None</span>}
                            {agent.specializations?.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{agent.specializations.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(agent)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openDetailsModal(agent)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {getDisplayStatus(agent) === 'pending' && (
                              <>
                                <button
                                  onClick={() => openConfirmModal(agent, 'approve')}
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                  title="Approve"
                                  disabled={updating}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openConfirmModal(agent, 'reject')}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                  title="Reject"
                                  disabled={updating}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
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
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Agent Application Details</h3>
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
                    {selectedAgent.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedAgent.name}</h4>
                  <p className="text-gray-600">{selectedAgent.email}</p>
                  {getStatusBadge(selectedAgent)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">License Number</p>
                      <p className="text-sm text-gray-600">
                        {selectedAgent.licenseNumber || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Agency Name</p>
                      <p className="text-sm text-gray-600">
                        {selectedAgent.agencyDetails?.name || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Agency Phone</p>
                      <p className="text-sm text-gray-600">
                        {selectedAgent.agencyDetails?.phone || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Agency Website</p>
                      <p className="text-sm text-gray-600">
                        {selectedAgent.agencyDetails?.website ? (
                          <a
                            href={selectedAgent.agencyDetails?.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {selectedAgent.agencyDetails?.website}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Agency Address</p>
                    <p className="text-sm text-gray-600">
                      {selectedAgent.agencyDetails?.address ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Specializations</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.specializations?.map((spec, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {spec}
                        </span>
                      )) || <span className="text-gray-500 text-sm">None specified</span>}
                    </div>
                  </div>
                </div>
              </div>

              {selectedAgent.bio && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Bio</p>
                  <p className="text-sm text-gray-600">{selectedAgent.bio}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Applied on:{' '}
                {new Date(selectedAgent.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            {getDisplayStatus(selectedAgent) === 'pending' && (
              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openConfirmModal(selectedAgent, 'approve');
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                  disabled={updating}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Application
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openConfirmModal(selectedAgent, 'reject');
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                  disabled={updating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Application
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && actionAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                {actionType === 'approve' ? (
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600 mr-3" />
                )}
                <h3 className="text-lg font-medium text-gray-900">
                  {actionType === 'approve' ? 'Approve Application' : 'Reject Application'}
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to {actionType} the application for{' '}
                <span className="font-semibold">{actionAgent.name}</span>?
                {actionType === 'approve' ? ' He can start using the platform as an Agent.' : ''}
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
                  onClick={() =>
                    handleStatusUpdate(
                      actionAgent._id,
                      actionType === 'approve' ? 'approved' : 'rejected'
                    )
                  }
                  className={`flex-1 px-4 py-2 rounded-md text-white transition-colors flex items-center justify-center ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={updating}
                >
                  {updating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAgents;