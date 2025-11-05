import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader } from "lucide-react";

export default function LeadGeneration() {
  const [sector, setSector] = useState("informatique");
  const [city, setCity] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!sector || !city || quantity < 1) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch("http://localhost:3000/api/generate-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sector,
          city,
          radius: 10,
          quantity: parseInt(quantity)
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        alert(`Generation terminee ! ${data.total} leads trouves`);
      } else {
        alert(`Erreur: ${data.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Generation de Leads IA</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle recherche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Secteur</label>
            <Select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full">
              <option value="informatique">Informatique</option>
              <option value="comptabilite">Comptabilite</option>
              <option value="juridique">Juridique</option>
              <option value="sante">Sante</option>
              <option value="btp">BTP</option>
              <option value="hotellerie">Hotellerie</option>
              <option value="immobilier">Immobilier</option>
              <option value="commerce">Commerce</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ville</label>
            <Input 
              placeholder="Ex: Paris, Lyon, Marseille..." 
              value={city} 
              onChange={(e) => setCity(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantite</label>
            <Input 
              type="number" 
              min="1" 
              max="10000" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 10,000 leads par recherche</p>
          </div>

          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Generation en cours...
              </>
            ) : (
              `Generer ${quantity} leads`
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6 border-green-500">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-3">Resultats</h3>
            <div className="space-y-2">
              <p>Trouves en cache: <span className="font-semibold">{result.found_in_database}</span></p>
              <p>Generes sur Google Maps: <span className="font-semibold">{result.fetched_from_google}</span></p>
              <p className="text-lg">Total: <span className="font-bold text-green-600">{result.total} leads</span></p>
              <p className="text-sm text-gray-600">Quota consomme: {result.quota_consumed}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
