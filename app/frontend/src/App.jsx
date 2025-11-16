import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Login from './pages/Login';

// Pages principales
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Users from './pages/Users';

// Campagnes
import Campaigns from './pages/Campaigns';
import CampaignsManager from './pages/CampaignsManager';
import CampaignDetails from './pages/CampaignDetails';
import CampaignDetailsPhoning from './pages/CampaignDetailsPhoning';
import CampaignAnalytics from './pages/CampaignAnalytics';
import Pipeline from './pages/Pipeline';

// Bases de donn�es
import LeadDatabases from './pages/LeadDatabases';
import DatabaseDetails from './pages/DatabaseDetails';
import ImportLeads from './pages/ImportLeads';
import MigrateLeads from './pages/MigrateLeads';

// Leads
import LeadDetails from './pages/LeadDetails';
import LeadScoring from './pages/LeadScoring';
import MyLeads from './pages/MyLeads';

// Email
import EmailTemplates from './pages/EmailTemplates';
import EmailCampaigns from './pages/EmailCampaigns';
import MailingSettings from './pages/MailingSettings';
import TestMailing from './pages/TestMailing';
import SpamDiagnostic from './pages/SpamDiagnostic';
import Unsubscribe from './pages/Unsubscribe';

// G�n�ration de leads
import LeadGeneration from './pages/LeadGeneration';
import CreateLeadSearch from './pages/CreateLeadSearch';
import GoogleApiSetup from './pages/GoogleApiSetup';

// Suivi et prospection
import FollowUps from './pages/FollowUps';
import ProspectingModePage from './pages/ProspectingModePage';
import CommercialDashboard from './pages/CommercialDashboard';

// Gestion des doublons
import DuplicateDetection from './pages/DuplicateDetection';
import RecategorizeLeads from './pages/RecategorizeLeads';

// �quipe et statistiques
import Teams from './pages/Teams';
import ManageTeam from './pages/ManageTeam';
import Statistics from './pages/Statistics';

// Taxonomie et tests
import ManageSectorTaxonomy from './pages/ManageSectorTaxonomy';
import TestTracking from './pages/TestTracking';
import TestZone from './pages/TestZone';

// Formation
import Formation from './pages/Formation';

// Signature de contrats
import SignContract from './pages/SignContract';

// Billing et crédits
import Billing from './pages/Billing';
import LeadCredits from './pages/LeadCredits';
import Services from './pages/Services';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes PUBLIQUES (pas d'auth) */}
          <Route path="/unsubscribe/:lead_id" element={<Unsubscribe />} />
          <Route path="/sign/:token" element={<SignContract />} />
          
          {/* Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Routes prot�g�es */}
          <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/CommercialDashboard" element={<CommercialDashboard />} />
            
            <Route path="/leads" element={<Leads />} />
            <Route path="/LeadDetails" element={<LeadDetails />} />
            <Route path="/LeadScoring" element={<LeadScoring />} />
            <Route path="/MyLeads" element={<MyLeads />} />
            
            <Route path="/LeadDatabases" element={<LeadDatabases />} />
            <Route path="/DatabaseDetails" element={<DatabaseDetails />} />
            <Route path="/ImportLeads" element={<ImportLeads />} />
            <Route path="/MigrateLeads" element={<MigrateLeads />} />

            <Route path="/Campaigns" element={<Campaigns />} />
            <Route path="/CampaignsManager" element={<CampaignsManager />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/CampaignDetails" element={<CampaignDetails />} />
            <Route path="/CampaignDetailsPhoning" element={<CampaignDetailsPhoning />} />
            <Route path="/CampaignAnalytics" element={<CampaignAnalytics />} />
            
            <Route path="/EmailTemplates" element={<EmailTemplates />} />
            <Route path="/EmailCampaigns" element={<EmailCampaigns />} />
            <Route path="/MailingSettings" element={<MailingSettings />} />
            <Route path="/TestMailing" element={<TestMailing />} />
            <Route path="/SpamDiagnostic" element={<SpamDiagnostic />} />
            
            {/* Redirection de l'ancien EmailPipeline vers le nouveau Pipeline */}
            <Route path="/EmailPipeline" element={<Navigate to="/pipeline" replace />} />
            <Route path="/Pipeline" element={<Navigate to="/pipeline" replace />} />
            
            <Route path="/LeadGeneration" element={<LeadGeneration />} />
            <Route path="/CreateLeadSearch" element={<CreateLeadSearch />} />
            <Route path="/GoogleApiSetup" element={<GoogleApiSetup />} />
            
            <Route path="/FollowUps" element={<FollowUps />} />
            <Route path="/ProspectingMode" element={<ProspectingModePage />} />
            
            <Route path="/DuplicateDetection" element={<DuplicateDetection />} />
            <Route path="/duplicates" element={<DuplicateDetection />} />
            <Route path="/RecategorizeLeads" element={<RecategorizeLeads />} />
            
            <Route path="/users" element={<Users />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/ManageTeam" element={<ManageTeam />} />
            <Route path="/Statistics" element={<Statistics />} />
            
            <Route path="/ManageSectorTaxonomy" element={<ManageSectorTaxonomy />} />
            <Route path="/TestTracking" element={<TestTracking />} />
            <Route path="/TestZone" element={<TestZone />} />
            <Route path="/Formation" element={<Formation />} />

            <Route path="/billing" element={<Billing />} />
            <Route path="/lead-credits" element={<LeadCredits />} />
            <Route path="/services" element={<Services />} />
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;