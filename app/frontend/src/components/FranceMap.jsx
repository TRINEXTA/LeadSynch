import React, { useState } from 'react';
import { MapPin, Users, TrendingUp } from 'lucide-react';

const REGIONS = [
  { id: 'idf', name: 'Île-de-France', color: '#3B82F6', leads: 0, x: 250, y: 120 },
  { id: 'hautsdefrance', name: 'Hauts-de-France', color: '#10B981', leads: 0, x: 220, y: 40 },
  { id: 'normandie', name: 'Normandie', color: '#F59E0B', leads: 0, x: 150, y: 100 },
  { id: 'grandest', name: 'Grand Est', color: '#8B5CF6', leads: 0, x: 350, y: 100 },
  { id: 'paysdeloire', name: 'Pays de la Loire', color: '#EC4899', leads: 0, x: 130, y: 200 },
  { id: 'bretagne', name: 'Bretagne', color: '#06B6D4', leads: 0, x: 40, y: 180 },
  { id: 'centrevaldeloire', name: 'Centre-Val de Loire', color: '#14B8A6', leads: 0, x: 200, y: 200 },
  { id: 'bourgognefranchecomte', name: 'Bourgogne-Franche-Comté', color: '#F97316', leads: 0, x: 300, y: 200 },
  { id: 'nouvelleaquitaine', name: 'Nouvelle-Aquitaine', color: '#84CC16', leads: 0, x: 130, y: 320 },
  { id: 'auvergnerhonealpes', name: 'Auvergne-Rhône-Alpes', color: '#A855F7', leads: 0, x: 300, y: 280 },
  { id: 'occitanie', name: 'Occitanie', color: '#EF4444', leads: 0, x: 200, y: 380 },
  { id: 'paca', name: "Provence-Alpes-Côte d'Azur", color: '#F43F5E', leads: 0, x: 350, y: 380 }
];

export default function FranceMap({ leadsData = {} }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // Fusionner les données des leads avec les régions
  const regionsWithData = REGIONS.map(region => ({
    ...region,
    leads: leadsData[region.id] || 0
  }));

  const maxLeads = Math.max(...regionsWithData.map(r => r.leads), 1);

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          Cartographie des Leads par Région
        </h2>
        <p className="text-gray-600 mt-1">
          Cliquez sur une région pour voir les détails
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte SVG */}
        <div className="lg:col-span-2">
          <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8">
            <svg viewBox="0 0 400 450" className="w-full h-auto">
              {/* Définition des filtres */}
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Points de régions */}
              {regionsWithData.map((region) => {
                const isHovered = hoveredRegion === region.id;
                const isSelected = selectedRegion === region.id;
                const radius = 8 + (region.leads / maxLeads) * 20;

                return (
                  <g key={region.id}>
                    {/* Cercle de la région */}
                    <circle
                      cx={region.x}
                      cy={region.y}
                      r={radius}
                      fill={region.color}
                      opacity={isHovered || isSelected ? 1 : 0.7}
                      stroke="white"
                      strokeWidth="2"
                      filter={isHovered || isSelected ? 'url(#glow)' : ''}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredRegion(region.id)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => setSelectedRegion(region.id)}
                      style={{
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        transformOrigin: `${region.x}px ${region.y}px`
                      }}
                    />

                    {/* Nombre de leads */}
                    {region.leads > 0 && (
                      <text
                        x={region.x}
                        y={region.y + 5}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {region.leads}
                      </text>
                    )}

                    {/* Nom de la région en hover */}
                    {isHovered && (
                      <text
                        x={region.x}
                        y={region.y - radius - 10}
                        textAnchor="middle"
                        fill="#1F2937"
                        fontSize="14"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {region.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Légende */}
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-gray-600">0 leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Moyenne</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-600"></div>
                <span className="text-gray-600">Élevé</span>
              </div>
            </div>
          </div>
        </div>

        {/* Détails de la région sélectionnée */}
        <div className="lg:col-span-1">
          {selectedRegion ? (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {regionsWithData.find(r => r.id === selectedRegion)?.name}
              </h3>

              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Total Leads</span>
                    </div>
                    <span className="text-3xl font-bold text-blue-600">
                      {regionsWithData.find(r => r.id === selectedRegion)?.leads || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Commerciaux</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {Math.floor(Math.random() * 5) + 1}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Taux conversion</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">
                      {Math.floor(Math.random() * 30) + 10}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRegion(null)}
                className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                Sélectionnez une région sur la carte pour voir les détails
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Liste des régions */}
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Répartition par région</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {regionsWithData
            .sort((a, b) => b.leads - a.leads)
            .map((region) => (
              <div
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedRegion === region.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: region.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${
                      selectedRegion === region.id ? 'text-white' : 'text-gray-900'
                    }`}>
                      {region.name}
                    </p>
                    <p className={`text-sm font-bold ${
                      selectedRegion === region.id ? 'text-white' : 'text-gray-600'
                    }`}>
                      {region.leads} leads
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
