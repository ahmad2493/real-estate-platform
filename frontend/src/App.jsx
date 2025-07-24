import React from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import Footer from './components/Footer';
import bgImage from './assets/bg.webp'; 

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main
        className="relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundColor: 'rgba(255,255,255,0.3)',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Find Your Dream Place
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12">
              Find Your Dream Home Easily And Quickly Here
            </p>

            <SearchForm />
          </div>
        </div>

        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gray-100 to-transparent opacity-50 pointer-events-none"></div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
