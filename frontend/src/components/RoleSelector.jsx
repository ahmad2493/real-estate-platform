import React, { useState, useEffect } from 'react';
import { User, Home, UserCheck, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const roles = [
  {
    id: 'Visitor',
    title: 'Visitor',
    description: 'Browse properties and explore listings',
    icon: User,
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    id: 'Tenant',
    title: 'Tenant',
    description: 'Find and rent your perfect home',
    icon: Home,
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    iconColor: 'text-green-600',
  },
  {
    id: 'Owner',
    title: 'Owner',
    description: 'Manage and list your properties',
    icon: UserCheck,
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    id: 'Agent',
    title: 'Agent',
    description: 'Help clients buy, sell, and rent',
    icon: Briefcase,
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    iconColor: 'text-orange-600',
  },
];

export default function RoleSelector({ onRoleSelect }) {
  const [selectedRole, setSelectedRole] = useState('');
  const navigate = useNavigate();

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    if (onRoleSelect) {
      onRoleSelect(roleId);
    }
  };


useEffect(() => {
  // Handle OAuth callback parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userData = urlParams.get('user');
  
  if (token && userData) {
    try {
      // Store authentication data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', userData);
      
      console.log('OAuth authentication data stored successfully');
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Error processing OAuth data:', error);
    }
  }
}, []);

useEffect(() => {
  // Handle OAuth callback parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userData = urlParams.get('user');
  const needsRoleSelection = urlParams.get('needsRoleSelection');
  
  if (token) {
    try {
      // Store authentication data
      localStorage.setItem('authToken', token);
      
      if (userData) {
        localStorage.setItem('user', userData);
      }
      
      console.log('OAuth authentication data stored successfully');
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Error processing OAuth data:', error);
    }
  }
}, []);

const handleContinue = async () => {
  if (selectedRole) {
    try {
      if (selectedRole === 'Agent') {
        await authAPI.updateRole(selectedRole);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.intendedRole = 'Agent';
        user.role = 'Visitor'; // Keep role as Visitor until approved
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/agent-application');
        return;
      }

      // For non-Agent roles
      await authAPI.updateRole(selectedRole);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.role = selectedRole;
      user.intendedRole = null;
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role');
    }
  }
};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white transform rotate-45"></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">What's your role?</h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Select your role to personalize your experience
            </p>
          </div>

          {/* Role Options */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {roles.map((role) => {
              const IconComponent = role.icon;
              const isSelected = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${
                      isSelected
                        ? `${role.color} border-current ring-2 ring-offset-2 ring-gray-200`
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`
                      p-2 rounded-lg
                      ${isSelected ? role.color : 'bg-gray-100'}
                    `}
                    >
                      <IconComponent
                        className={`
                        w-5 h-5
                        ${isSelected ? role.iconColor : 'text-gray-600'}
                      `}
                      />
                    </div>
                    <div>
                      <h3
                        className={`
                        font-medium text-sm
                        ${isSelected ? 'text-gray-900' : 'text-gray-700'}
                      `}
                      >
                        {role.title}
                      </h3>
                      <p
                        className={`
                        text-xs mt-1 leading-tight
                        ${isSelected ? 'text-gray-600' : 'text-gray-500'}
                      `}
                      >
                        {role.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`
              w-full py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200
              ${
                selectedRole
                  ? 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-900'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Continue
          </button>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-xs">You cannot change this later.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
