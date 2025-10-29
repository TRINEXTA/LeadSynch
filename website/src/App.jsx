import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ChatbotAsefi from './components/asefi/ChatbotAsefi';

// Pages publiques
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Register from './pages/Register';
import Login from './pages/Login';
import Features from './pages/Features';
import Terms from './pages/Terms';
import Sales from './pages/Sales';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ActivateAccount from './pages/ActivateAccount';
import SetupPassword from './pages/SetupPassword';

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques avec Header/Footer */}
        <Route path="/" element={
          <>
            <Header />
            <Home />
            <Footer />
            <ChatbotAsefi />
          </>
        } />
        
        <Route path="/pricing" element={
          <>
            <Header />
            <Pricing />
            <Footer />
          </>
        } />
        
        <Route path="/features" element={
          <>
            <Header />
            <Features />
            <Footer />
          </>
        } />
        
        <Route path="/terms" element={<Terms />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/privacy" element={<Privacy />} />
        
        {/* Routes d'authentification (sans Header/Footer) */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/activate/:token" element={<ActivateAccount />} />
        <Route path="/setup-password/:token" element={<SetupPassword />} />
      </Routes>
    </Router>
  );
}

export default App;