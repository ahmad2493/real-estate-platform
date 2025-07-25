import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import Footer from './components/Footer';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import OAuthHandler from './components/OAuthHandler';

// Landing Page Component (your current App content)
const Landing = () => (
  <div className="min-h-screen bg-gray-50">
    <Header />

    {/* Hero Section */}
    <main
      className="relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop")',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-48 relative z-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Find Your Dream Place
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-12">
            Revolutionizing Real Estate with AI-Powered Intelligence
          </p>
          <SearchForm />
        </div>
      </div>
    </main>

    {/* Featured Properties Section */}
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Properties</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our handpicked selection of premium properties
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Property 1 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="relative h-64">
              <img
                src="https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                alt="Modern Villa"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">
                For Sale
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Modern Villa</h3>
              <p className="text-gray-600 mb-4">Chicago, Illinois</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">$1,200,000</span>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>4 beds</span>
                  <span>3 baths</span>
                </div>
              </div>
            </div>
          </div>

          {/* Property 2 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="relative h-64">
              <img
                src="https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                alt="Luxury House"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">
                For Sale
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Luxury House</h3>
              <p className="text-gray-600 mb-4">California, USA</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">$2,500,000</span>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>5 beds</span>
                  <span>4 baths</span>
                </div>
              </div>
            </div>
          </div>

          {/* Property 3 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="relative h-64">
              <img 
                src="https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop" 
                alt="Contemporary Home"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">
                For Rent
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contemporary Home</h3>
              <p className="text-gray-600 mb-4">Miami, Florida</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">$8,500/mo</span>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>3 beds</span>
                  <span>2 baths</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/signin" />;
};

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* OAuth callback handler */}
        <Route path="/auth/callback" element={<OAuthHandler />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;