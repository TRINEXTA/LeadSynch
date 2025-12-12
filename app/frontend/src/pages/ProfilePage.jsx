import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Check,
  Briefcase,
  Users,
  DollarSign,
  Calendar,
  Edit3,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Crown,
  Target,
  TrendingUp,
  Upload
} from 'lucide-react';
import { HIERARCHY_CONFIG, COMMISSION_TYPE_LABELS } from '../lib/permissions';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, teamRes] = await Promise.all([
        api.get('/profile').catch(() => ({ data: { user: user } })),
        api.get('/users/team').catch(() => ({ data: { users: [], team: null } }))
      ]);
      setProfileData(profileRes.data.user || profileRes.data || user);
      setTeamInfo(teamRes.data);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      setProfileData(user);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    try {
      setUploadingAvatar(true);

      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await api.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = uploadRes.data.url;
      await api.put('/profile', { avatar_url: imageUrl });

      setProfileData(prev => ({ ...prev, avatar_url: imageUrl }));
      showNotification('success', 'Photo de profil mise à jour');

      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Erreur upload avatar:', err);
      showNotification('error', 'Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.new_password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setChangingPassword(true);
      await api.post('/profile/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      showNotification('success', 'Mot de passe modifié avec succès');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordSection(false);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Administrateur', color: 'bg-red-100 text-red-800 border-red-200', icon: Shield },
      manager: { label: 'Manager', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Users },
      commercial: { label: 'Commercial', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Target },
      user: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: User }
    };
    return badges[role] || badges.user;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  const data = profileData || user;
  const roleBadge = getRoleBadge(data?.role);
  const RoleIcon = roleBadge.icon;
  const hierarchyConfig = data?.hierarchical_level ? HIERARCHY_CONFIG[data.hierarchical_level] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-6 lg:p-8">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm animate-slide-in ${
          notification.type === 'success'
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
            : 'bg-red-50/95 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 overflow-hidden mb-8 border border-slate-100">
          {/* Cover */}
          <div className="h-40 md:h-48 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>

          {/* Profile Info */}
          <div className="px-6 md:px-10 pb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-20 relative z-10">
              {/* Avatar */}
              <div className="relative group mx-auto md:mx-0">
                <div className="w-36 h-36 md:w-40 md:h-40 rounded-3xl bg-white shadow-2xl overflow-hidden ring-4 ring-white">
                  {data?.avatar_url ? (
                    <img src={data.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white tracking-tight">
                        {getInitials(data?.first_name, data?.last_name)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white mb-2" />
                      <span className="text-white text-sm font-medium">Changer la photo</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Name and Badges */}
              <div className="flex-1 text-center md:text-left pb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  {data?.first_name} {data?.last_name}
                </h1>
                <p className="text-gray-500 mt-1 text-lg">{data?.email}</p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${roleBadge.color}`}>
                    <RoleIcon className="w-4 h-4" />
                    {roleBadge.label}
                  </span>
                  {hierarchyConfig && (
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${hierarchyConfig.color}`}>
                      <Crown className="w-4 h-4" />
                      {hierarchyConfig.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              {(data?.role === 'manager' || data?.role === 'commercial') && (data?.commission_rate > 0 || data?.team_commission_rate > 0) && (
                <div className="hidden lg:flex gap-4">
                  {data?.commission_rate > 0 && (
                    <div className="text-center px-6 py-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
                      <p className="text-3xl font-bold text-emerald-600">{data.commission_rate}%</p>
                      <p className="text-xs text-emerald-700 font-medium mt-1">Ma commission</p>
                    </div>
                  )}
                  {data?.team_commission_rate > 0 && (
                    <div className="text-center px-6 py-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                      <p className="text-3xl font-bold text-violet-600">{data.team_commission_rate}%</p>
                      <p className="text-xs text-violet-700 font-medium mt-1">Bonus équipe</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information - READ ONLY */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                Informations personnelles
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Prénom</label>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 group-hover:border-indigo-200 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="font-semibold text-gray-900 text-lg">{data?.first_name || '-'}</span>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Nom</label>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 group-hover:border-indigo-200 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="font-semibold text-gray-900 text-lg">{data?.last_name || '-'}</span>
                  </div>
                </div>

                <div className="md:col-span-2 group">
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Adresse email</label>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 group-hover:border-indigo-200 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="font-semibold text-gray-900 text-lg">{data?.email || '-'}</span>
                  </div>
                </div>

                {data?.phone && (
                  <div className="md:col-span-2 group">
                    <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Téléphone</label>
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 group-hover:border-indigo-200 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        <Phone className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="font-semibold text-gray-900 text-lg">{data.phone}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Ces informations ne peuvent être modifiées que par un administrateur. Contactez votre responsable pour toute modification.
                </p>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 p-8 border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  Sécurité du compte
                </h2>
                {!showPasswordSection && (
                  <button
                    onClick={() => setShowPasswordSection(true)}
                    className="flex items-center gap-2 px-5 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    Modifier
                  </button>
                )}
              </div>

              {showPasswordSection ? (
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  {passwordError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{passwordError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        className="w-full px-5 py-4 pr-14 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="w-full px-5 py-4 pr-14 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-lg"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Minimum 8 caractères</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="w-full px-5 py-4 pr-14 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordSection(false);
                        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                        setPasswordError('');
                      }}
                      className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-semibold text-lg"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg shadow-indigo-200"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Modification...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Enregistrer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Lock className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-gray-600 text-lg tracking-widest">••••••••••••</span>
                    <p className="text-sm text-slate-400 mt-1">Mot de passe sécurisé</p>
                  </div>
                  <Check className="w-6 h-6 text-emerald-500 ml-auto" />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Organization */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 p-6 border border-slate-100">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-violet-600" />
                </div>
                Organisation
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100/50">
                  <p className="text-xs text-indigo-600 font-medium mb-1 uppercase tracking-wider">Rôle</p>
                  <p className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                    <RoleIcon className="w-5 h-5 text-indigo-600" />
                    {roleBadge.label}
                  </p>
                </div>

                {hierarchyConfig && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-100/50">
                    <p className="text-xs text-amber-600 font-medium mb-1 uppercase tracking-wider">Niveau hiérarchique</p>
                    <p className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                      <Crown className="w-5 h-5 text-amber-600" />
                      {hierarchyConfig.label}
                    </p>
                  </div>
                )}

                {data?.manager_name && (
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Responsable</p>
                    <p className="font-bold text-gray-900 text-lg">{data.manager_name}</p>
                  </div>
                )}

                {teamInfo?.team?.name && (
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Équipe</p>
                    <p className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-slate-400" />
                      {teamInfo.team.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Commission - Only for manager/commercial */}
            {(data?.role === 'manager' || data?.role === 'commercial') && (
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 p-6 border border-slate-100">
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  Rémunération
                </h2>

                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100/50">
                    <p className="text-xs text-emerald-600 font-medium mb-2 uppercase tracking-wider">Commission personnelle</p>
                    <p className="text-4xl font-bold text-emerald-600">
                      {data?.commission_rate || 0}<span className="text-2xl">%</span>
                    </p>
                  </div>

                  {data?.role === 'manager' && data?.team_commission_rate > 0 && (
                    <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100/50">
                      <p className="text-xs text-violet-600 font-medium mb-2 uppercase tracking-wider">Bonus sur ventes équipe</p>
                      <p className="text-4xl font-bold text-violet-600">
                        {data.team_commission_rate}<span className="text-2xl">%</span>
                      </p>
                    </div>
                  )}

                  {data?.commission_type && (
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Type</p>
                      <p className="font-semibold text-gray-900">
                        {COMMISSION_TYPE_LABELS[data.commission_type] || data.commission_type}
                      </p>
                    </div>
                  )}
                </div>

                <a
                  href="/my-commissions"
                  className="mt-5 flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl hover:from-emerald-700 hover:to-green-700 transition-all font-semibold shadow-lg shadow-emerald-200/50"
                >
                  <TrendingUp className="w-5 h-5" />
                  Voir mes commissions
                </a>
              </div>
            )}

            {/* Account */}
            <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl shadow-xl p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
              <div className="relative">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
                  <Calendar className="w-5 h-5" />
                  Compte
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-3 border-b border-white/20">
                    <span className="text-indigo-200">Créé le</span>
                    <span className="font-semibold">
                      {data?.created_at
                        ? new Date(data.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-indigo-200">Statut</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      Actif
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
