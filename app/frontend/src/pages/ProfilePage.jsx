import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Shield, Key, Camera, Save, Eye, EyeOff,
  DollarSign, TrendingUp, Calendar, Award, Briefcase
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  getHierarchyLabel,
  getHierarchyConfig,
  COMMISSION_TYPE_LABELS
} from '../lib/permissions';

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [commissionStats, setCommissionStats] = useState(null);

  // Formulaire profil
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    avatar_url: ''
  });

  // Formulaire mot de passe
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      setProfile(response.data.user);
      setCommissionStats(response.data.commissionStats);
      setFormData({
        first_name: response.data.user.first_name || '',
        last_name: response.data.user.last_name || '',
        phone: response.data.user.phone || '',
        avatar_url: response.data.user.avatar_url || ''
      });
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/profile', formData);
      toast.success('Profil mis à jour avec succès');
      // Rafraîchir le contexte auth si la fonction existe
      if (refreshUser) {
        await refreshUser();
      }
      loadProfile();
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères');
      return;
    }

    try {
      setChangingPassword(true);
      await api.post('/profile/change-password', passwordForm);
      toast.success('Mot de passe modifié avec succès');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      toast.error(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleDisplay = () => {
    if (!profile) return '';

    const roleLabels = {
      admin: 'Administrateur',
      manager: 'Manager',
      commercial: 'Commercial',
      user: 'Utilisateur'
    };

    let label = roleLabels[profile.role] || profile.role;

    // Ajouter le niveau hiérarchique si présent
    if (profile.hierarchical_level) {
      const hierarchyLabel = getHierarchyLabel(profile.hierarchical_level);
      if (hierarchyLabel) {
        label = hierarchyLabel;
      }
    }

    return label;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          Mon Profil
        </h1>
        <p className="text-gray-600 mt-2">Gérez vos informations personnelles et votre mot de passe</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte profil principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Informations personnelles
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-4 border-purple-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700"
                    onClick={() => {
                      const url = prompt('URL de l\'image avatar:', formData.avatar_url);
                      if (url !== null) {
                        setFormData({ ...formData, avatar_url: url });
                      }
                    }}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-sm text-gray-500">{profile?.email}</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    {getRoleDisplay()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </form>
          </div>

          {/* Changement de mot de passe */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-600" />
              Changer le mot de passe
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                {changingPassword ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar droite */}
        <div className="space-y-6">
          {/* Informations de rôle */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Mon rôle
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Rôle</span>
                <span className="font-semibold text-purple-700">{getRoleDisplay()}</span>
              </div>

              {profile?.hierarchical_level && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Niveau</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getHierarchyConfig(profile.hierarchical_level)?.color || 'bg-gray-100 text-gray-700'}`}>
                    {getHierarchyConfig(profile.hierarchical_level)?.shortLabel}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Membre depuis</span>
                <span className="font-semibold text-gray-700">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric'
                  }) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Informations de commission */}
          {['manager', 'commercial'].includes(profile?.role) && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Ma rémunération
              </h3>

              <div className="space-y-3">
                {profile?.commission_rate > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Commission</span>
                    <span className="font-semibold text-green-600">{profile.commission_rate}%</span>
                  </div>
                )}

                {profile?.role === 'manager' && profile?.team_commission_rate > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bonus équipe</span>
                    <span className="font-semibold text-blue-600">{profile.team_commission_rate}%</span>
                  </div>
                )}

                {profile?.commission_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type</span>
                    <span className="font-semibold text-gray-700">
                      {COMMISSION_TYPE_LABELS[profile.commission_type] || profile.commission_type}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats commissions */}
              {commissionStats && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Mes gains</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600">Validés</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(commissionStats.total_validated)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-yellow-600">En attente</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {formatCurrency(commissionStats.total_pending)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dernière connexion */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Dernière activité
            </h3>
            <p className="text-purple-100 text-sm">
              {profile?.last_login
                ? new Date(profile.last_login).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Première connexion'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
