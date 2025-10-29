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

// Dashboard
import DashboardLayout from './components/dashboard/DashboardLayout';
import Dashboard from './pages/Dashboard';

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
        
        {/* Routes Dashboard (protégées) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<PlaceholderPage title="Leads" />} />
          <Route path="campaigns" element={<PlaceholderPage title="Campagnes" />} />
          <Route path="database" element={<PlaceholderPage title="Base de données" />} />
          <Route path="templates" element={<PlaceholderPage title="Templates" />} />
          <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
          <Route path="asefi" element={<PlaceholderPage title="Asefi IA" />} />
          <Route path="team" element={<PlaceholderPage title="Équipe" />} />
          <Route path="subscription" element={<PlaceholderPage title="Abonnement" />} />
          <Route path="settings" element={<PlaceholderPage title="Paramètres" />} />
        </Route>
      </Routes>
    </Router>
  );
}

// Composant placeholder pour les pages à venir
function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
          <span className="text-4xl">🚧</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-xl text-gray-600 mb-8">Cette page sera bientôt disponible !</p>
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold">
          En construction 🔨
        </div>
      </div>
    </div>
  );
}

export default App;