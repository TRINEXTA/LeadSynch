import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MessageSquare, Send, ArrowRight, ArrowLeft, Database, Users, Calendar, Settings, Paperclip, X, Eye, TestTube, Check, Target, Clock, Zap, AlertCircle, Plus, Edit } from 'lucide-react';
import api from '../api/axios';

const CAMPAIGN_TYPES = [
  { id: 'email', name: 'Campagne Email', icon: Mail, color: 'from-blue-600 to-cyan-600', description: 'Envoi emails automatises' },
  { id: 'phoning', name: 'Campagne Phoning', icon: Phone, color: 'from-green-600 to-emerald-600', description: 'Appels telephoniques' },
  { id: 'sms', name: 'Campagne SMS', icon: MessageSquare, color: 'from-purple-600 to-pink-600', description: 'Messages SMS' },
  { id: 'whatsapp', name: 'WhatsApp', icon: Send, color: 'from-emerald-600 to-teal-600', description: 'Messages WhatsApp' }
];

const OBJECTIVES = [
  { id: 'leads', name: 'Generation de Leads', description: 'Tracker clics et creer des leads', icon: Target, tracking: ['delivery', 'opens', 'clicks'] },
  { id: 'promo', name: 'Promotion/Marketing', description: 'Suivi ouvertures uniquement', icon: Zap, tracking: ['delivery', 'opens'] }
];

export default function CampaignsManager() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [campaignType, setCampaignType] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDatabases, setSelectedDatabases] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState({});
  const [databaseSectors, setDatabaseSectors] = useState({});
  const [leadsCount, setLeadsCount] = useState(0);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [testEmails, setTestEmails] = useState(['']);
  const [estimatedDuration, setEstimatedDuration] = useState(null);
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    objective: 'leads',
    subject: '',
    goal_description: '',
    message: '',
    link: '',
    template_id: '',
    assigned_users: [],
    send_days: [1, 2, 3, 4, 5],
    send_time_start: '08:00',
    send_time_end: '18:00',
    start_date: '',
    start_time: '08:00',
    emails_per_cycle: 50,
    cycle_interval_minutes: 10,
    status: 'draft'
  });

  useEffect(() => {
    loadDatabases();
    loadTemplates();
    loadUsers();
    
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
      setIsEditMode(true);
      setEditingCampaignId(editId);
      loadCampaignForEdit(editId);
    }
  }, []);

  const loadCampaignForEdit = async (campaignId) => {
    setLoading(true);
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      const campaign = response.data.campaign;
      
      const type = CAMPAIGN_TYPES.find(t => t.id === campaign.type);
      if (type) {
        setCampaignType(type);
      }
      
      setFormData({
        name: campaign.name || '',
        type: campaign.type || '',
        objective: campaign.objective || 'leads',
        subject: campaign.subject || '',
        goal_description: campaign.goal_description || '',
        message: campaign.message || '',
        link: campaign.link || '',
        template_id: campaign.template_id || '',
        assigned_users: campaign.assigned_users || [],
        send_days: campaign.send_days || [1, 2, 3, 4, 5],
        send_time_start: campaign.send_time_start || '08:00',
        send_time_end: campaign.send_time_end || '18:00',
        start_date: campaign.start_date || '',
        start_time: campaign.start_time || '08:00',
        emails_per_cycle: campaign.emails_per_cycle || 50,
        cycle_interval_minutes: campaign.cycle_interval_minutes || 10,
        status: campaign.status || 'draft'
      });
      
      if (campaign.databases) {
        setSelectedDatabases(campaign.databases);
      }
      
      if (campaign.sectors) {
        setSelectedSectors(campaign.sectors);
      }
      
      if (campaign.attachments) {
        setAttachments(campaign.attachments);
      }
      
      setStep(1);
      
    } catch (error) {
      console.error('Erreur chargement campagne:', error);
      alert('Erreur lors du chargement de la campagne');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateLeadsCount();
  }, [selectedDatabases, selectedSectors]);

  useEffect(() => {
    calculateEstimatedDuration();
  }, [leadsCount, formData.emails_per_cycle, formData.send_time_start, formData.send_time_end]);

  const loadDatabases = async () => {
    try {
      const response = await api.get('/lead-databases');
      setDatabases(response.data.databases || []);
    } catch (error) {
      console.error('Erreur databases:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Erreur templates:', error);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('🔍 Loading users...');
      const response = await api.get('/users');
      console.log('✅ Users response:', response.data);
      console.log('👥 Users array:', response.data.users);
      console.log('📊 Users count:', response.data.users?.length);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('❌ Erreur users:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const loadSectorsForDatabase = async (databaseId) => {
    try {
      const response = await api.get(`/lead-databases/${databaseId}/sectors`);
      setDatabaseSectors(prev => ({
        ...prev,
        [databaseId]: response.data.sectors || []
      }));
    } catch (error) {
      setDatabaseSectors(prev => ({ ...prev, [databaseId]: [] }));
    }
  };

  const handleDatabaseSelect = (dbId) => {
    if (selectedDatabases.includes(dbId)) {
      setSelectedDatabases(selectedDatabases.filter(id => id !== dbId));
      const newSectors = { ...selectedSectors };
      delete newSectors[dbId];
      setSelectedSectors(newSectors);
    } else {
      setSelectedDatabases([...selectedDatabases, dbId]);
      loadSectorsForDatabase(dbId);
    }
  };

  const handleSectorToggle = (dbId, sector) => {
    const currentSectors = selectedSectors[dbId] || [];
    const newSectors = currentSectors.includes(sector)
      ? currentSectors.filter(s => s !== sector)
      : [...currentSectors, sector];
    
    setSelectedSectors({ ...selectedSectors, [dbId]: newSectors });
  };

  const calculateLeadsCount = async () => {
    if (selectedDatabases.length === 0) {
      setLeadsCount(0);
      return;
    }

    setLoadingLeads(true);
    try {
      const filters = selectedDatabases.map(dbId => ({
        database_id: dbId,
        sectors: selectedSectors[dbId] || []
      }));

      const response = await api.post('/leads-count-multi/count-multi', { filters });
      setLeadsCount(response.data.count || 0);
    } catch (error) {
      console.error('Erreur count:', error);
      setLeadsCount(0);
    } finally {
      setLoadingLeads(false);
    }
  };

  const calculateEstimatedDuration = () => {
    if (leadsCount === 0 || formData.emails_per_cycle === 0) {
      setEstimatedDuration(null);
      return;
    }

    const cycles = Math.ceil(leadsCount / formData.emails_per_cycle);
    const totalMinutes = (cycles * formData.cycle_interval_minutes) + cycles;
    
    const [startHour, startMin] = formData.send_time_start.split(':').map(Number);
    const [endHour, endMin] = formData.send_time_end.split(':').map(Number);
    const dailyMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    const days = Math.floor(totalMinutes / dailyMinutes);
    const remainingMinutes = totalMinutes % dailyMinutes;
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    setEstimatedDuration({ days, hours, minutes, cycles, totalMinutes });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Fichier trop volumineux. Maximum ${maxSizeMB}MB`);
      return;
    }

    setUploadingFile(true);
    const formDataFile = new FormData();
    formDataFile.append('file', file);

    try {
      const response = await api.post('/upload-attachment', formDataFile, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newAttachment = {
        ...response.data.attachment,
        name: file.name,
        size: (file.size / 1024).toFixed(2)
      };
      setAttachments([...attachments, newAttachment]);
      alert('Fichier ajoute !');
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur upload fichier');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleTypeSelect = (type) => {
    setCampaignType(type);
    setFormData({ ...formData, type: type.id });
    setStep(1);
  };

  const handlePreviewTemplate = async () => {
    if (!formData.template_id) return;

    try {
      const response = await api.get(`/email-templates/${formData.template_id}`);
      const template = response.data.template;
      setPreviewHtml(template.html_body || '<p>Aucun contenu</p>');
      setShowPreview(true);
    } catch (error) {
      console.error('Erreur preview:', error);
      alert('Erreur previsualisation');
    }
  };

  const handleSendTestEmail = async () => {
    const validEmails = testEmails.filter(e => e.trim());
    if (validEmails.length === 0) {
      alert('Entrez au moins 1 email');
      return;
    }
    if (validEmails.length > 3) {
      alert('Maximum 3 emails de test');
      return;
    }

    try {
      await api.post('/campaigns/test-emails', {
        template_id: formData.template_id,
        recipients: validEmails,
        attachments: attachments.map(a => a.id)
      });
      alert('✅ Emails de test envoyes avec succes !');
    } catch (error) {
      console.error('❌ Erreur test:', error);
      alert('❌ Erreur envoi test: ' + (error.response?.data?.error || error.message));
    }
  };

  const addTestEmail = () => {
    if (testEmails.length < 3) {
      setTestEmails([...testEmails, '']);
    }
  };

  const removeTestEmail = (index) => {
    setTestEmails(testEmails.filter((_, i) => i !== index));
  };

  const updateTestEmail = (index, value) => {
    const newEmails = [...testEmails];
    newEmails[index] = value;
    setTestEmails(newEmails);
  };

  const handleSaveDraft = async () => {
    try {
      console.log('🟡 Sauvegarde brouillon, données envoyées:', {
        ...formData,
        database_id: selectedDatabases[0],
        sectors: selectedSectors,
        attachments: attachments.map(a => a.id)
      });

      const campaignData = {
        ...formData,
        database_id: selectedDatabases[0],
        sectors: selectedSectors,
        attachments: attachments.map(a => a.id),
        status: 'draft'
      };

      await api.post('/campaigns', campaignData);
      alert('Campagne enregistree en brouillon !');
      navigate('/campaigns');
    } catch (error) {
      console.error('❌ Erreur brouillon:', error);
      alert('❌ Erreur sauvegarde brouillon: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreateCampaign = async (startNow = false) => {
    try {
      console.log('🚀 Création campagne, données envoyées:', {
        ...formData,
        database_id: selectedDatabases[0],
        sectors: selectedSectors,
        attachments: attachments.map(a => a.id),
        status: startNow ? 'active' : 'scheduled'
      });

      const campaignData = {
        ...formData,
        database_id: selectedDatabases[0],
        sectors: selectedSectors,
        attachments: attachments.map(a => a.id),
        status: startNow ? 'active' : 'scheduled'
      };

      if (isEditMode && editingCampaignId) {
        await api.put(`/campaigns/${editingCampaignId}`, campaignData);
        alert('Campagne mise a jour !');
      } else {
        await api.post('/campaigns', campaignData);
        alert(startNow ? 'Campagne demarree !' : 'Campagne programmee !');
      }
      
      navigate('/campaigns');
    } catch (error) {
      console.error('❌ Erreur création:', error);
      alert('❌ Erreur: ' + (error.response?.data?.error || error.message));
    }
  };

  const getTotalSteps = () => {
    if (campaignType?.id === 'email') return 5;
    if (campaignType?.id === 'phoning') return 4;
    return 4;
  };

  const canGoNext = () => {
    if (step === 0) return campaignType !== null;
    if (step === 1) return formData.name && formData.goal_description;
    if (step === 2) return selectedDatabases.length > 0;
    if (step === 3 && campaignType?.id === 'email') return formData.template_id;
    if (step === 4 || (step === 3 && campaignType?.id !== 'email')) return formData.assigned_users.length > 0;
    return true;
  };

  const handleBackToTypeSelection = () => {
    if (confirm('Changer de type de campagne ? Vous perdrez vos donnees.')) {
      setStep(0);
      setCampaignType(null);
      setFormData({
        name: '',
        type: '',
        objective: 'leads',
        subject: '',
        goal_description: '',
        message: '',
        link: '',
        template_id: '',
        assigned_users: [],
        send_days: [1, 2, 3, 4, 5],
        send_time_start: '08:00',
        send_time_end: '18:00',
        start_date: '',
        start_time: '08:00',
        emails_per_cycle: 50,
        cycle_interval_minutes: 10,
        status: 'draft'
      });
    }
  };

  // STEP 0: Choix type
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Creer une campagne</h1>
            <p className="text-gray-600">Choisissez le type de campagne</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {CAMPAIGN_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type)}
                  className="group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  <div className="relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 mx-auto`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{type.name}</h3>
                    <p className="text-gray-600">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/campaigns')}
            className="mx-auto block bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  const Icon = campaignType?.icon || Mail;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la campagne...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackToTypeSelection}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Changer de type"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${campaignType.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Modifier la campagne' : campaignType.name}
                </h1>
                <p className="text-sm text-gray-600">Etape {step}/{getTotalSteps()}</p>
              </div>
            </div>
            <button 
              onClick={handleSaveDraft}
              className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl font-semibold hover:bg-yellow-200"
            >
              Sauver en brouillon
            </button>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full bg-gradient-to-r ${campaignType.color} transition-all`}
              style={{ width: `${(step / getTotalSteps()) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* STEP 1: Infos + Objectif */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Informations et objectif</h2>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de la campagne *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Campagne Janvier 2025"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                />
              </div>

              {campaignType.id === 'email' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Objectif de la campagne *</label>
                    <div className="grid grid-cols-2 gap-4">
                      {OBJECTIVES.map(obj => {
                        const ObjIcon = obj.icon;
                        return (
                          <button
                            key={obj.id}
                            onClick={() => setFormData({...formData, objective: obj.id})}
                            className={`border-2 rounded-xl p-4 transition-all ${
                              formData.objective === obj.id
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <ObjIcon className="w-8 h-8 text-purple-600 mb-2" />
                            <h4 className="font-bold text-gray-900 mb-1">{obj.name}</h4>
                            <p className="text-xs text-gray-600">{obj.description}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              Tracking: {obj.tracking.join(', ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Objet du mail *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Ex: Decouvrez nos nouveautes"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              {(campaignType.id === 'sms' || campaignType.id === 'whatsapp') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Votre message..."
                      rows={4}
                      maxLength={160}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.message.length}/160 caracteres</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lien (optionnel)</label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      placeholder="https://..."
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description de l'objectif *</label>
                <textarea
                  value={formData.goal_description}
                  onChange={(e) => setFormData({...formData, goal_description: e.target.value})}
                  placeholder="Quel est l'objectif de cette campagne ?"
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Bases + Secteurs */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Selection des bases</h2>
                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold">
                  {loadingLeads ? 'Calcul...' : `${leadsCount} leads`}
                </div>
              </div>

              <div className="space-y-4">
                {databases.map(db => (
                  <div key={db.id} className="border-2 border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedDatabases.includes(db.id)}
                        onChange={() => handleDatabaseSelect(db.id)}
                        className="w-5 h-5"
                      />
                      <Database className="w-5 h-5 text-purple-600" />
                      <span className="font-bold text-gray-900">{db.name}</span>
                      <span className="text-sm text-gray-500">({db.leads_count || 0} leads)</span>
                    </div>

                    {selectedDatabases.includes(db.id) && databaseSectors[db.id] && databaseSectors[db.id].length > 0 && (
                      <div className="ml-8 mt-3 flex flex-wrap gap-2">
                        {databaseSectors[db.id].map(sector => (
                          <button
                            key={sector}
                            onClick={() => handleSectorToggle(db.id, sector)}
                            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                              (selectedSectors[db.id] || []).includes(sector)
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {sector}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Template (EMAIL uniquement) */}
          {step === 3 && campaignType.id === 'email' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Template et pieces jointes</h2>

              {templates.length === 0 ? (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun template disponible</h3>
                  <p className="text-gray-600 mb-4">Vous devez creer un template email avant de continuer</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleSaveDraft}
                      className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-600"
                    >
                      Sauver en brouillon
                    </button>
                    <button
                      onClick={() => navigate('/email-templates')}
                      className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
                    >
                      Creer un template
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Template email *</label>
                    <div className="flex gap-3">
                      <select
                        value={formData.template_id}
                        onChange={(e) => setFormData({...formData, template_id: e.target.value})}
                        className="flex-1 border-2 border-gray-200 rounded-xl p-3 focus:border-purple-500"
                      >
                        <option value="">Selectionner un template</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {formData.template_id && (
                        <button
                          onClick={handlePreviewTemplate}
                          className="bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          Previsualiser
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pieces jointes (max 5MB)</label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="w-full border-2 border-gray-200 rounded-xl p-3"
                    />
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((att, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-gray-600" />
                              <span className="text-sm">{att.name} ({att.size} KB)</span>
                            </div>
                            <button onClick={() => removeAttachment(i)} className="text-red-600 hover:text-red-700">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4 (ou 3 pour phoning): Commerciaux */}
          {((step === 4 && campaignType.id === 'email') || (step === 3 && campaignType.id !== 'email')) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Affectation commerciaux</h2>
{/* DEBUG INFO */}
              {users.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-center text-gray-900">
                    ⚠️ Aucun utilisateur chargé
                  </p>
                  <p className="text-xs text-center text-gray-600 mt-2">
                    Vérifiez la console (F12) pour voir les logs de chargement
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-mono">
                  Step: {step} | Type: {campaignType?.id} | Users: {users.length}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      const newUsers = formData.assigned_users.includes(user.id)
                        ? formData.assigned_users.filter(id => id !== user.id)
                        : [...formData.assigned_users, user.id];
                      setFormData({...formData, assigned_users: newUsers});
                    }}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      formData.assigned_users.includes(user.id)
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-bold text-gray-900">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 (ou 4): Planification */}
          {((step === 5 && campaignType.id === 'email') || (step === 4 && campaignType.id !== 'email')) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Planification et parametres</h2>

              {campaignType.id === 'email' && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Systeme d'envoi intelligent
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Emails par cycle</label>
                      <input
                        type="number"
                        value={formData.emails_per_cycle}
                        onChange={(e) => setFormData({...formData, emails_per_cycle: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        className="w-full border-2 border-gray-200 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Pause entre cycles (min)</label>
                      <input
                        type="number"
                        value={formData.cycle_interval_minutes}
                        disabled
                        className="w-full border-2 border-gray-300 rounded-lg p-2 bg-gray-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Fixe a 10 min (protection systeme)</p>
                    </div>
                  </div>

                  {estimatedDuration && (
                    <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                      <p className="text-sm text-gray-600 mb-2">Duree estimee de la campagne:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {estimatedDuration.days > 0 && `${estimatedDuration.days}j `}
                        {estimatedDuration.hours > 0 && `${estimatedDuration.hours}h `}
                        {estimatedDuration.minutes}min
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {estimatedDuration.cycles} cycles × {formData.emails_per_cycle} emails/cycle = {leadsCount} emails total
                      </p>
                      <p className="text-xs text-gray-500">
                        Temps total: {estimatedDuration.totalMinutes} minutes ({estimatedDuration.cycles} × 10min pause + {estimatedDuration.cycles}min envoi)
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {formData.start_date ? 'Date et heure de demarrage de la campagne' : 'Demarrer maintenant ou programmer ?'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Date (optionnel)</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border-2 border-gray-200 rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Heure de debut</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3"
                    />
                  </div>
                </div>
                {formData.start_date ? (
                  <div className="mt-2 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700 font-semibold">
                      📅 La campagne demarrera le {new Date(formData.start_date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })} a {formData.start_time}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">
                    ⚡ Sans date, la campagne demarrera immediatement apres creation
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Plage horaire quotidienne
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Pendant toute la duree de la campagne, les emails seront envoyes uniquement durant ces heures
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Debut journee</label>
                    <input
                      type="time"
                      value={formData.send_time_start}
                      onChange={(e) => setFormData({...formData, send_time_start: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Fin journee</label>
                    <input
                      type="time"
                      value={formData.send_time_end}
                      onChange={(e) => setFormData({...formData, send_time_end: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 bg-white"
                    />
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3 border-2 border-purple-200">
                  <p className="text-sm text-purple-700 font-semibold">
                    🕐 Envois quotidiens de {formData.send_time_start} a {formData.send_time_end}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Jours d'envoi</label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { id: 1, name: 'Lun', gradient: 'from-blue-400 via-blue-500 to-blue-600', icon: '🌅' },
                    { id: 2, name: 'Mar', gradient: 'from-green-400 via-green-500 to-green-600', icon: '🌞' },
                    { id: 3, name: 'Mer', gradient: 'from-yellow-400 via-orange-500 to-orange-600', icon: '🌤️' },
                    { id: 4, name: 'Jeu', gradient: 'from-pink-400 via-pink-500 to-pink-600', icon: '🌆' },
                    { id: 5, name: 'Ven', gradient: 'from-purple-400 via-purple-500 to-purple-600', icon: '🌃' },
                    { id: 6, name: 'Sam', gradient: 'from-indigo-400 via-indigo-500 to-indigo-600', icon: '🎨' },
                    { id: 7, name: 'Dim', gradient: 'from-red-400 via-rose-500 to-rose-600', icon: '🌈' }
                  ].map((day) => {
                    const isSelected = formData.send_days.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        onClick={() => {
                          const newDays = isSelected
                            ? formData.send_days.filter(d => d !== day.id)
                            : [...formData.send_days, day.id];
                          setFormData({...formData, send_days: newDays});
                        }}
                        className={`relative overflow-hidden rounded-xl p-4 font-bold transition-all transform hover:scale-105 hover:shadow-xl ${
                          isSelected
                            ? `bg-gradient-to-br ${day.gradient} text-white shadow-lg`
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        )}
                        <div className="relative z-10">
                          <div className="text-2xl mb-1">{day.icon}</div>
                          <div className="text-sm">{day.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  {formData.send_days.length} jour(s) selectionne(s)
                </p>
              </div>

              {campaignType.id === 'email' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-blue-600" />
                    Emails de test (max 3)
                  </h3>
                  {testEmails.map((email, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateTestEmail(i, e.target.value)}
                        placeholder="email@exemple.com"
                        className="flex-1 border-2 border-gray-200 rounded-lg p-2"
                      />
                      {testEmails.length > 1 && (
                        <button onClick={() => removeTestEmail(i)} className="text-red-600">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {testEmails.length < 3 && (
                    <button onClick={addTestEmail} className="text-blue-600 text-sm font-semibold mb-3">
                      + Ajouter un email
                    </button>
                  )}
                  <button
                    onClick={handleSendTestEmail}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Envoyer les tests
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Precedent
            </button>
          )}
          
          {step < getTotalSteps() ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Suivant
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleCreateCampaign(false)}
                disabled={!formData.start_date}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Programmer
              </button>
              <button
                onClick={() => handleCreateCampaign(true)}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                {isEditMode ? 'Enregistrer et demarrer' : 'Demarrer maintenant'}
              </button>
            </>
          )}
        </div>

        {/* Modal Preview */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-2xl font-bold">Previsualisation du template</h2>
                <button onClick={() => setShowPreview(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}