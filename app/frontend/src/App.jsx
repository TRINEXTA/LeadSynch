import { log, error, warn } from "../lib/logger.js";
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import ActivityTracker from './components/ActivityTracker';

// ✅ IMPORTS STATIQUES : Seulement les pages critiques pour le chargement initial
import Login from './pages/Login';

// 🚀 CODE SPLITTING : Toutes les autres pages en lazy loading
// Auth
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ActivateAccount = lazy(() => import('./pages/ActivateAccount'));

// Pages principales
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardUniversel = lazy(() => import('./pages/DashboardUniversel'));
const DashboardManager = lazy(() => import('./pages/DashboardManager'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserReports = lazy(() => import('./pages/UserReports'));
const Leads = lazy(() => import('./pages/Leads'));
const Users = lazy(() => import('./pages/Users'));

// Campagnes
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignsManager = lazy(() => import('./pages/CampaignsManager'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const CampaignDetailsPhoning = lazy(() => import('./pages/CampaignDetailsPhoning'));
const CampaignAnalytics = lazy(() => import('./pages/CampaignAnalytics'));
const Pipeline = lazy(() => import('./pages/Pipeline'));

// Bases de données
const LeadDatabases = lazy(() => import('./pages/LeadDatabases'));
const LeadDatabasesAdmin = lazy(() => import('./pages/LeadDatabasesAdmin'));
const DatabaseDetails = lazy(() => import('./pages/DatabaseDetails'));
const ImportLeads = lazy(() => import('./pages/ImportLeads'));
const MigrateLeads = lazy(() => import('./pages/MigrateLeads'));

// Leads
const LeadDetails = lazy(() => import('./pages/LeadDetails'));
const LeadScoring = lazy(() => import('./pages/LeadScoring'));
const MyLeads = lazy(() => import('./pages/MyLeads'));

// Email
const EmailTemplates = lazy(() => import('./pages/EmailTemplates'));
const EmailCampaigns = lazy(() => import('./pages/EmailCampaigns'));
const MailingSettings = lazy(() => import('./pages/MailingSettings'));
const TestMailing = lazy(() => import('./pages/TestMailing'));
const SpamDiagnostic = lazy(() => import('./pages/SpamDiagnostic'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));

// Business Configuration
const BusinessSettings = lazy(() => import('./pages/BusinessSettings'));

// Génération de leads
const LeadGeneration = lazy(() => import('./pages/LeadGeneration'));
const LeadGenerationSmart = lazy(() => import('./pages/LeadGenerationSmart'));
const CreateLeadSearch = lazy(() => import('./pages/CreateLeadSearch'));
const GoogleApiSetup = lazy(() => import('./pages/GoogleApiSetup'));

// Suivi et prospection
const FollowUps = lazy(() => import('./pages/FollowUps'));
const ProspectingModePage = lazy(() => import('./pages/ProspectingModePage'));
const CommercialDashboard = lazy(() => import('./pages/CommercialDashboard'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const CallReports = lazy(() => import('./pages/CallReports'));

// Gestion des doublons
const DuplicateDetection = lazy(() => import('./pages/DuplicateDetection'));
const RecategorizeLeads = lazy(() => import('./pages/RecategorizeLeads'));

// Équipe et statistiques
const Teams = lazy(() => import('./pages/Teams'));
const ManageTeam = lazy(() => import('./pages/ManageTeam'));
const Statistics = lazy(() => import('./pages/Statistics'));

// Taxonomie et tests
const ManageSectorTaxonomy = lazy(() => import('./pages/ManageSectorTaxonomy'));
const TestTracking = lazy(() => import('./pages/TestTracking'));
const TestZone = lazy(() => import('./pages/TestZone'));

// Formation
const Formation = lazy(() => import('./pages/Formation'));

// Secteurs géographiques
const GeographicSectors = lazy(() => import('./pages/GeographicSectors'));

// Signature de contrats et acceptation de propositions
const SignContract = lazy(() => import('./pages/SignContract'));
const AcceptProposal = lazy(() => import('./pages/AcceptProposal'));

// Propositions et contrats
const Proposals = lazy(() => import('./pages/Proposals'));
const Contracts = lazy(() => import('./pages/Contracts'));

// Billing et crédits
const Billing = lazy(() => import('./pages/Billing'));
const LeadCredits = lazy(() => import('./pages/LeadCredits'));
const Services = lazy(() => import('./pages/Services'));

// Super-Admin TRINEXTA
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminTenants = lazy(() => import('./pages/SuperAdminTenants'));
const SuperAdminTenantDetails = lazy(() => import('./pages/SuperAdminTenantDetails'));
const SuperAdminSubscriptions = lazy(() => import('./pages/SuperAdminSubscriptions'));
const SuperAdminInvoices = lazy(() => import('./pages/SuperAdminInvoices'));

// Profil et espace personnel
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MyCommissions = lazy(() => import('./pages/MyCommissions'));
const Planning = lazy(() => import('./pages/Planning'));

// Composant de chargement élégant
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Chargement...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Activity tracking (invisible component) */}
        <ActivityTracker />

        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Routes PUBLIQUES (pas d'auth) */}
            <Route path="/unsubscribe/:lead_id" element={<Unsubscribe />} />
            <Route path="/sign/:token" element={<SignContract />} />
            <Route path="/accept/:token" element={<AcceptProposal />} />

            {/* Login */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/activate" element={<ActivateAccount />} />

            {/* Routes protégées */}
            <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route path="/dashboard" element={<DashboardUniversel />} />
              <Route path="/dashboard-classic" element={<Dashboard />} />
              <Route path="/dashboard-manager" element={<DashboardManager />} />
              <Route path="/dashboard-admin" element={<AdminDashboard />} />
              <Route path="/user-reports" element={<UserReports />} />
              <Route path="/CommercialDashboard" element={<CommercialDashboard />} />

              <Route path="/leads" element={<Leads />} />
              <Route path="/LeadDetails" element={<LeadDetails />} />
              <Route path="/LeadScoring" element={<LeadScoring />} />
              <Route path="/MyLeads" element={<MyLeads />} />

              <Route path="/LeadDatabases" element={<LeadDatabases />} />
              <Route path="/LeadDatabasesAdmin" element={<LeadDatabasesAdmin />} />
              <Route path="/DatabaseDetails" element={<DatabaseDetails />} />
              <Route path="/ImportLeads" element={<ImportLeads />} />
              <Route path="/MigrateLeads" element={<MigrateLeads />} />

              <Route path="/Campaigns" element={<Campaigns />} />
              <Route path="/CampaignsManager" element={<CampaignsManager />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/CampaignDetails" element={<CampaignDetails />} />
              <Route path="/CampaignDetailsPhoning" element={<CampaignDetailsPhoning />} />
              <Route path="/CampaignAnalytics" element={<CampaignAnalytics />} />

              <Route path="/EmailTemplates" element={<EmailTemplates />} />
              <Route path="/EmailCampaigns" element={<EmailCampaigns />} />
              <Route path="/MailingSettings" element={<MailingSettings />} />
              <Route path="/BusinessSettings" element={<BusinessSettings />} />
              <Route path="/TestMailing" element={<TestMailing />} />
              <Route path="/SpamDiagnostic" element={<SpamDiagnostic />} />

              {/* Redirection de l'ancien EmailPipeline vers le nouveau Pipeline */}
              <Route path="/EmailPipeline" element={<Navigate to="/pipeline" replace />} />
              <Route path="/Pipeline" element={<Navigate to="/pipeline" replace />} />

              <Route path="/LeadGeneration" element={<LeadGenerationSmart />} />
              <Route path="/lead-generation-legacy" element={<LeadGeneration />} />
              <Route path="/CreateLeadSearch" element={<CreateLeadSearch />} />
              <Route path="/GoogleApiSetup" element={<GoogleApiSetup />} />

              <Route path="/FollowUps" element={<FollowUps />} />
              <Route path="/ProspectingMode" element={<ProspectingModePage />} />
              <Route path="/call-reports" element={<CallReports />} />
              <Route path="/my-tasks" element={<MyTasks />} />

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
              <Route path="/geographic-sectors" element={<GeographicSectors />} />

              <Route path="/billing" element={<Billing />} />
              <Route path="/lead-credits" element={<LeadCredits />} />
              <Route path="/services" element={<Services />} />

              {/* Routes Profil et espace personnel */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-commissions" element={<MyCommissions />} />
              <Route path="/planning" element={<Planning />} />

              {/* Routes Super-Admin TRINEXTA */}
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/tenants" element={<SuperAdminTenants />} />
              <Route path="/super-admin/tenants/:id" element={<SuperAdminTenantDetails />} />
              <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptions />} />
              <Route path="/super-admin/invoices" element={<SuperAdminInvoices />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
