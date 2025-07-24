import React from 'react';
import { ChevronDown } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
            </div>
            <span className="text-xl font-bold text-gray-900">Greatstate</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-900 font-medium hover:text-gray-600 transition-colors">
              Home
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Project
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Services
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              Career
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
              About us
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language selector */}
            <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors">
              <div className="w-5 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">🇬🇧</span>
              </div>
              <span className="text-sm font-medium">En</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Register button */}
            <button className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Register
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;