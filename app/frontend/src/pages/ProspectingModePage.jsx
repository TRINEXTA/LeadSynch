<<<<<<< HEAD
import { log, error, warn } from "./../lib/logger.js";
=======
import { log, error, warn } from "../lib/logger.js";
>>>>>>> origin/main
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../api/axios';
import ProspectionMode from './ProspectingMode';

export default function ProspectingModePage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await api.get('/pipeline-leads');
      const leadsData = response.data.leads || [];

      // Filtrer pour garder seulement les leads qui ont besoin d'être prospectés
      // (exclure les leads déjà gagnés, hors scope, etc.)
      const prospecableLeads = leadsData.filter(lead =>
        !['gagne', 'perdu'].includes(lead.stage)
      );

      setLeads(prospecableLeads);
      setLoading(false);
    } catch (error) {
      error('Erreur chargement leads:', error);
      setLoading(false);
    }
  };

  const handleExit = () => {
    navigate('/pipeline');
  };

  const handleLeadUpdated = () => {
    loadLeads();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Chargement des leads...</p>
        </div>
      </div>
    );
  }

  return (
    <ProspectionMode
      leads={leads}
      onExit={handleExit}
      onLeadUpdated={handleLeadUpdated}
    />
  );
}
