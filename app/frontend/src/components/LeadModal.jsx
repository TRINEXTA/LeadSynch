import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Building, User, Mail, Phone, MapPin, Globe, DollarSign, Tag } from 'lucide-react';
import LeadHistoryPanel from "./LeadHistoryPanel";
import toast from 'react-hot-toast';
import { confirmDelete } from '../lib/confirmDialog';

export default function LeadModal({ lead, stage, onClose, onSave }) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    city: '',
    website: '',
    industry: '',
    deal_value: '',
    notes: '',
    score: 50
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (lead) {
      setFormData({
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        city: lead.city || '',
        website: lead.website || '',
        industry: lead.industry || '',
        deal_value: lead.deal_value || '',
        notes: lead.notes || '',
        score: lead.score || 50
      });
    }
  }, [lead]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Nom de l\'entreprise requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // ✅ Nettoyer les données avant envoi
      const cleanedData = {
        ...formData,
        deal_value: formData.deal_value === '' ? null : parseFloat(formData.deal_value) || null,
        score: formData.score === '' ? 50 : parseInt(formData.score) || 50
      };
      
      await onSave(cleanedData);
    } catch (error) {
      error('Erreur sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    if (!await confirmDelete(`le lead "${lead.company_name}"`)) {
      return;
    }

    try {
      // TODO: Implémenter la suppression
      log('Suppression du lead:', lead.id);
      onClose();
    } catch (err) {
      error('Erreur suppression:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">
                {lead ? 'Éditer le lead' : 'Créer un nouveau lead'}
              </h2>
              {stage && (
                <p className="text-purple-100 text-sm mt-1">
                  Sera ajouté dans la colonne "{stage}"
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations principales */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-600" />
              Informations de l'entreprise
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Ex: Cabinet Expertise Valoux"
                  className={`w-full border-2 ${errors.company_name ? 'border-red-500' : 'border-gray-200'} rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all`}
                />
                {errors.company_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact principal
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="Ex: Jean-Pierre Valoux"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Secteur
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="Ex: Cabinet comptable"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Coordonnées
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@entreprise.com"
                  className={`w-full border-2 ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Paris"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Site Web
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.entreprise.com"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Valeur commerciale */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Informations commerciales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valeur estimée (€)
                </label>
                <input
                  type="number"
                  value={formData.deal_value}
                  onChange={(e) => handleChange('deal_value', e.target.value)}
                  placeholder="5000"
                  min="0"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Score de qualification (0-100)
                </label>
                <input
                  type="range"
                  value={formData.score}
                  onChange={(e) => handleChange('score', e.target.value)}
                  min="0"
                  max="100"
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Froid</span>
                  <span className="font-bold text-purple-600">{formData.score}</span>
                  <span>Chaud</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Ajoutez des notes sur ce lead..."
              rows={4}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
            />
          </div>

          {/* 🆕 HISTORIQUE DES ACTIONS */}
          {lead && lead.id && (
            <LeadHistoryPanel 
              pipelineLeadId={lead.pipeline_lead_id || lead.id}
              leadId={lead.lead_id || lead.id}
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {lead && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-100 text-red-700 py-3 px-6 rounded-xl font-semibold hover:bg-red-200 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Supprimer
              </button>
            )}

            <div className="flex-1"></div>

            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Enregistrement...' : (lead ? 'Mettre à jour' : 'Créer le lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}