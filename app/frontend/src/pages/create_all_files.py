# -*- coding: utf-8 -*-
import os

# Supprimer les anciens fichiers problématiques
files_to_keep = ['Dashboard.jsx', 'Login.jsx', 'Leads.jsx', 'Users.jsx', 'Teams.jsx']
for f in os.listdir('.'):
    if f.endswith('.jsx') and f not in files_to_keep:
        try:
            os.remove(f)
            print(f'Supprime: {f}')
        except:
            pass

# Dictionnaire avec TOUS les fichiers
files = {
    'Campaigns.jsx': '''import React, { useState, useEffect } from "react";
import { LeadSync } from "@/api/LeadSyncClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Target, Users, TrendingUp, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await LeadSync.entities.Campaign.list();
      setCampaigns(data || []);
    } catch (error) {
      console.error("Erreur chargement campagnes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Campagnes</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Campagne
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {campaign.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{campaign.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {campaign.lead_count || 0} leads
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {campaign.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune campagne pour le moment</p>
        </div>
      )}
    </div>
  );
}
''',

    'ImportLeads.jsx': '''import React, { useState } from "react";
import { LeadSync } from "@/api/LeadSyncClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export default function ImportLeads() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\\n').filter(line => line.trim());
      
      const headers = lines[0].split(',');
      const leads = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const lead = {};
        headers.forEach((header, index) => {
          lead[header.trim()] = values[index]?.trim() || '';
        });
        
        if (lead.company_name || lead.email) {
          await LeadSync.entities.Lead.create({
            company_name: lead.company_name || '',
            contact_name: lead.contact_name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            status: 'new',
            source: 'csv_import'
          });
          leads.push(lead);
        }
      }
      
      setResult({ success: true, count: leads.length });
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Importer des Leads</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Fichier CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />
            {file && <p className="text-sm text-green-600">Fichier: {file.name}</p>}
          </div>
          
          <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
            {isUploading ? 'Import en cours...' : 'Importer'}
          </Button>
          
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {result.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                <p>{result.success ? `${result.count} leads importes` : result.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'''
}

# Créer tous les fichiers
for filename, content in files.items():
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Cree: {filename}')

print('\\nTermine! 2 fichiers crees.')