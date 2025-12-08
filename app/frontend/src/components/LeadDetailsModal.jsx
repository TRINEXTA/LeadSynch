import { log, error, warn } from "../lib/logger.js";
import React, { useState, useEffect } from 'react';
import { X, Edit, Save, Phone, Mail, MapPin, Building2, User, Calendar, FileText, Plus, Trash2, Star, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmDelete } from '../lib/confirmDialog';

export default function LeadDetailsModal({ lead, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: lead.company_name || '',
    contact_name: lead.contact_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    address: lead.address || '',
    city: lead.city || '',
    postal_code: lead.postal_code || '',
    website: lead.website || '',
    sector: lead.sector || '',
    status: lead.status || 'nouveau',
    employee_count: lead.employee_count || '',
    siret: lead.siret || '',
    naf_code: lead.naf_code || ''
  });

  const [contacts, setContacts] = useState([]);
  const [phones, setPhones] = useState([]);
  const [offices, setOffices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  useEffect(() => {
    if (activeTab === 'contacts') loadContacts();
    if (activeTab === 'phones') loadPhones();
    if (activeTab === 'offices') loadOffices();
    if (activeTab === 'notes') loadNotes();
  }, [activeTab]);

  const loadContacts = async () => {
    try {
      const res = await api.get(`/leads/${lead.id}/contacts`);
      setContacts(res.data.contacts || []);
    } catch (error) {
      error('Erreur chargement contacts:', error);
    }
  };

  const loadPhones = async () => {
    try {
      const res = await api.get(`/leads/${lead.id}/phones`);
      setPhones(res.data.phones || []);
    } catch (error) {
      error('Erreur chargement téléphones:', error);
    }
  };

  const loadOffices = async () => {
    try {
      const res = await api.get(`/leads/${lead.id}/offices`);
      setOffices(res.data.offices || []);
    } catch (error) {
      error('Erreur chargement bureaux:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const res = await api.get(`/leads/${lead.id}/notes`);
      setNotes(res.data.notes || []);
    } catch (error) {
      error('Erreur chargement notes:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put(`/leads/${lead.id}`, formData);
      toast.success('Lead mis à jour avec succès !');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      error('Erreur mise à jour:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!await confirmDelete('ce contact')) return;
    try {
      await api.delete(`/leads/${lead.id}/contacts/${contactId}`);
      loadContacts();
      toast.success('Contact supprimé');
    } catch (err) {
      toast.error('Erreur suppression contact');
    }
  };

  const handleDeletePhone = async (phoneId) => {
    if (!await confirmDelete('ce téléphone')) return;
    try {
      await api.delete(`/leads/${lead.id}/phones/${phoneId}`);
      loadPhones();
      toast.success('Téléphone supprimé');
    } catch (err) {
      toast.error('Erreur suppression téléphone');
    }
  };

  const handleDeleteOffice = async (officeId) => {
    if (!await confirmDelete('ce bureau')) return;
    try {
      await api.delete(`/leads/${lead.id}/offices/${officeId}`);
      loadOffices();
      toast.success('Bureau supprimé');
    } catch (err) {
      toast.error('Erreur suppression bureau');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!await confirmDelete('cette note')) return;
    try {
      await api.delete(`/leads/${lead.id}/notes/${noteId}`);
      loadNotes();
      toast.success('Note supprimée');
    } catch (err) {
      toast.error('Erreur suppression note');
    }
  };

  const tabs = [
    { id: 'info', label: 'Informations', icon: Building2 },
    { id: 'contacts', label: 'Contacts', icon: User },
    { id: 'phones', label: 'Téléphones', icon: Phone },
    { id: 'offices', label: 'Bureaux', icon: MapPin },
    { id: 'notes', label: 'Notes', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{lead.company_name}</h2>
            <p className="text-purple-100 text-sm mt-1">
              {lead.city && `${lead.city} • `}
              {lead.sector && `Secteur: ${lead.sector}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 flex gap-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-purple-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB: Informations */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Informations générales</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      disabled={!isEditing}
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    />
                    {formData.website && (
                      <a
                        href={formData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
                  <select
                    disabled={!isEditing}
                    value={formData.sector}
                    onChange={(e) => setFormData({...formData, sector: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  >
                    <option value="autre">Autre</option>
                    <option value="informatique">Informatique / IT</option>
                    <option value="commerce">Commerce / Retail</option>
                    <option value="btp">BTP / Construction</option>
                    <option value="sante">Santé</option>
                    <option value="juridique">Juridique / Legal</option>
                    <option value="comptabilite">Comptabilité</option>
                    <option value="immobilier">Immobilier</option>
                    <option value="hotellerie">Hôtellerie-Restauration</option>
                    <option value="logistique">Logistique / Transport</option>
                    <option value="education">Éducation</option>
                    <option value="consulting">Consulting</option>
                    <option value="rh">Ressources Humaines</option>
                    <option value="services">Services</option>
                    <option value="industrie">Industrie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    disabled={!isEditing}
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  >
                    <option value="nouveau">Nouveau</option>
                    <option value="qualifie">Qualifié</option>
                    <option value="en_cours">En cours</option>
                    <option value="client">Client</option>
                    <option value="perdu">Perdu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de salariés</label>
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={formData.employee_count}
                    onChange={(e) => setFormData({...formData, employee_count: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                  <input
                    type="text"
                    disabled
                    value={formData.siret}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code NAF</label>
                  <input
                    type="text"
                    disabled
                    value={formData.naf_code}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Contacts */}
          {activeTab === 'contacts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Contacts ({contacts.length})</h3>
                <button 
                  onClick={() => setShowAddContact(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un contact
                </button>
              </div>
              {contacts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun contact supplémentaire</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-start hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{contact.full_name}</h4>
                          {contact.is_primary && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">Principal</span>}
                          {contact.is_decision_maker && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">Décisionnaire</span>}
                        </div>
                        {contact.position && <p className="text-sm text-gray-600 mb-1">📋 {contact.position}</p>}
                        {contact.department && <p className="text-sm text-gray-600 mb-2">🏢 {contact.department}</p>}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                          {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                          {contact.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.mobile}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteContact(contact.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Téléphones */}
          {activeTab === 'phones' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Téléphones ({phones.length})</h3>
                <button 
                  onClick={() => setShowAddPhone(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un téléphone
                </button>
              </div>
              {phones.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Phone className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun téléphone supplémentaire</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {phones.map(phone => (
                    <div key={phone.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center hover:bg-gray-100 transition">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{phone.phone_number}</p>
                          <p className="text-sm text-gray-600">{phone.label || phone.phone_type}</p>
                        </div>
                        {phone.is_primary && <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />}
                        {phone.is_verified && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">✓ Vérifié</span>}
                      </div>
                      <button onClick={() => handleDeletePhone(phone.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Bureaux */}
          {activeTab === 'offices' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Bureaux et Sites ({offices.length})</h3>
                <button 
                  onClick={() => setShowAddOffice(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un bureau
                </button>
              </div>
              {offices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun bureau supplémentaire</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offices.map(office => (
                    <div key={office.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{office.office_name}</h4>
                            {office.is_primary && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">Principal</span>}
                          </div>
                          {office.office_type && <p className="text-sm text-gray-600 mb-2">🏢 {office.office_type}</p>}
                        </div>
                        <button onClick={() => handleDeleteOffice(office.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {office.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{office.address}</p>}
                        {office.city && <p>📍 {office.postal_code} {office.city}</p>}
                        {office.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{office.phone}</p>}
                        {office.employee_count && <p>👥 {office.employee_count} employés</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Notes */}
          {activeTab === 'notes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Notes ({notes.length})</h3>
                <button 
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une note
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune note</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className={`p-4 rounded-lg border ${note.is_important ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} hover:shadow-md transition`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">{note.note_type}</span>
                          {note.is_pinned && <span className="text-yellow-500" title="Épinglée">📌</span>}
                          {note.is_important && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">❗ Important</span>}
                        </div>
                        <button onClick={() => handleDeleteNote(note.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap mb-2">{note.content}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {note.author_name || 'Inconnu'} • {new Date(note.created_at).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}