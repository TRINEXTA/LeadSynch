import React, { useState } from 'react';
import { X, FileText, Save, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';

const TRINEXTA_SERVICES = [
  { id: 'essentielle', name: 'Offre Essentielle', price: 129, url: 'https://trinexta.com/offre-essentielle/' },
  { id: 'serenite', name: 'Offre Sérénité', price: 299, url: 'https://trinexta.com/offre-serenite/' },
  { id: 'impulsion', name: 'Offre Impulsion', price: 0, url: 'https://trinexta.com/offre-impulsion/' }
];

export default function QuickProposalModal({ lead, onClose, onSuccess }) {
  const [selectedService, setSelectedService] = useState('');
  const [customLines, setCustomLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);

  const addCustomLine = () => {
    setCustomLines([...customLines, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeCustomLine = (index) => {
    setCustomLines(customLines.filter((_, i) => i !== index));
  };

  const updateCustomLine = (index, field, value) => {
    const newLines = [...customLines];
    newLines[index][field] = value;
    setCustomLines(newLines);
  };

  const calculateTotal = () => {
    let total = 0;
    
    if (selectedService) {
      const service = TRINEXTA_SERVICES.find(s => s.id === selectedService);
      if (service && service.price > 0) total += service.price;
    }
    
    customLines.forEach(line => {
      total += (line.quantity || 0) * (line.unit_price || 0);
    });
    
    return total;
  };

  const handleSave = async () => {
    if (!selectedService && customLines.length === 0) {
      alert('Veuillez sélectionner au moins un service');
      return;
    }

    setSaving(true);
    try {
      const services = [];
      
      if (selectedService) {
        const service = TRINEXTA_SERVICES.find(s => s.id === selectedService);
        services.push({
          name: service.name,
          quantity: 1,
          unit_price: service.price,
          url: service.url
        });
      }
      
      customLines.forEach(line => {
        if (line.description && line.unit_price > 0) {
          services.push(line);
        }
      });

      await api.post('/proposals', {
        pipeline_lead_id: lead.id,
        lead_id: lead.lead_id || lead.id,
        services,
        notes,
        valid_until: validUntil,
        total_ht: calculateTotal()
      });

      alert('✅ Devis créé !');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors de la création du devis');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Créer un devis</h2>
              <p className="text-purple-100 text-sm mt-1">{lead.company_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Offres Trinexta */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Sélectionner une offre Trinexta
            </label>
            <div className="grid grid-cols-3 gap-3">
              {TRINEXTA_SERVICES.map(service => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id === selectedService ? '' : service.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedService === service.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <p className="font-bold text-gray-900 mb-1">{service.name}</p>
                  {service.price > 0 ? (
                    <p className="text-lg font-bold text-purple-600">{service.price}€ HT/mois</p>
                  ) : (
                    <p className="text-sm text-gray-600">Sur devis</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Lignes personnalisées */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-700">
                Services supplémentaires
              </label>
              <button
                onClick={addCustomLine}
                className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg font-semibold hover:bg-purple-200 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {customLines.map((line, index) => (
                <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateCustomLine(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateCustomLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qté"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    value={line.unit_price}
                    onChange={(e) => updateCustomLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Prix HT"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeCustomLine(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Validité */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Valable jusqu'au
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes internes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes pour le devis..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">Total HT</span>
              <span className="text-3xl font-bold text-purple-600">{calculateTotal().toFixed(2)} €</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Création...' : 'Créer le devis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}