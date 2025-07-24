import React, { useState } from 'react';
import { Search, MapPin, Home, DollarSign } from 'lucide-react';

const SearchForm = () => {
  const [location, setLocation] = useState('NYC, USA');
  const [type, setType] = useState('Minimalism');
  const [price, setPrice] = useState('$ 2000 USD');

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mx-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Location */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              placeholder="Enter location"
            />
          </div>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all appearance-none bg-white"
            >
              <option value="Minimalism">Minimalism</option>
              <option value="Modern">Modern</option>
              <option value="Traditional">Traditional</option>
              <option value="Contemporary">Contemporary</option>
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Price
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              placeholder="Enter price range"
            />
          </div>
        </div>

        {/* Search Button */}
        <button className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 h-12">
          <Search className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SearchForm;