import os

# Supprimer anciens fichiers
files_to_keep = ['Dashboard.jsx', 'Login.jsx', 'Leads.jsx', 'Users.jsx', 'Teams.jsx']
for f in os.listdir('.'):
    if f.endswith('.jsx') and f not in files_to_keep:
        try:
            os.remove(f)
        except:
            pass

files = {}

files['Campaigns.jsx'] = '''import React, { useState, useEffect } from "react";
import { LeadSync } from "@/api/LeadSynchClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus } from "lucide-react";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await LeadSync.entities.Campaign.list();
        setCampaigns(data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Campagnes</h1>
      <div className="grid gap-4">
        {campaigns.map(c => (
          <Card key={c.id}>
            <CardHeader><CardTitle>{c.name}</CardTitle></CardHeader>
            <CardContent><p>{c.description}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
'''

files['ImportLeads.jsx'] = '''import React from "react";
import { Card } from "@/components/ui/card";

export default function ImportLeads() {
  return <div className="p-6"><h1 className="text-3xl font-bold">Import Leads</h1></div>;
}
'''

# CREER LES FICHIERS
for filename, content in files.items():
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Cree: {filename}')

print('Termine - 2 fichiers crees!')