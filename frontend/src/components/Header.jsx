import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const Header = ({ leftComponent }) => {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Custom component (hamburger) or Logo */}
          <div className="flex items-center space-x-4">
            {leftComponent}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">Estatify</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-gray-900 font-medium hover:text-gray-600 transition-colors"
            >
              Home
            </Link>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Properties
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Agents
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Services
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Contact us
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              About us
            </a>
          </nav>

          {/* Right side - Auth Links */}
          <div className="flex items-center space-x-4">
            {token ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/signin"
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
