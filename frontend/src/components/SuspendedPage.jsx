import { useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const SuspendedPage = () => {
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('suspendedUser');
    window.location.href = '/signin';
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@estatify.com?subject=Account Suspension Inquiry';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 text-red-600">
            <ExclamationTriangleIcon className="h-16 w-16" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Account Suspended
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account has been temporarily suspended. Please contact our support team for assistance.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={handleContactSupport}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Contact Support
          </button>
          
          <button
            onClick={handleLogout}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Logout
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact support immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuspendedPage;