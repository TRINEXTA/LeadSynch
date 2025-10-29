import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ChatbotAsefi from './components/asefi/ChatbotAsefi';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Register from './pages/Register';
import Login from './pages/Login';
import Features from './pages/Features';
import Terms from './pages/Terms';
import Sales from './pages/Sales';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>
        <Footer />
        
        {/* Chatbot Asefi - Présent sur toutes les pages */}
        <ChatbotAsefi />
      </div>
    </Router>
  );
}

export default App;
