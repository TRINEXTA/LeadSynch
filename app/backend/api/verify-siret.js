import { log, error, warn } from "../lib/logger.js";
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { siret } = req.body;
    
    // Validation du format SIRET
    if (!siret || siret.length !== 14 || !/^\d{14}$/.test(siret)) {
      return res.status(400).json({ 
        valid: false,
        error: 'SIRET invalide. Le SIRET doit contenir exactement 14 chiffres.'
      });
    }

    log(`🔍 Vérification SIRET: ${siret}`);

    // Appel à l'API Recherche Entreprises (Gouvernement français - GRATUITE)
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&mtm_campaign=leadsync`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LeadSynch/1.0'
        }
      }
    );

    if (!response.ok) {
      error(`❌ Erreur API: ${response.status}`);
      return res.status(404).json({ 
        valid: false,
        error: 'Impossible de vérifier le SIRET. Service temporairement indisponible.'
      });
    }

    const data = await response.json();
    
    // Vérifier si des résultats ont été trouvés
    if (!data.results || data.results.length === 0) {
      log(`❌ SIRET non trouvé: ${siret}`);
      return res.status(404).json({ 
        valid: false,
        error: 'SIRET non trouvé dans la base Sirene. Vérifiez le numéro saisi.'
      });
    }

    const entreprise = data.results[0];
    
    // Vérifier que l'entreprise est active
    if (entreprise.etat_administratif === 'F') {
      return res.status(400).json({ 
        valid: false,
        error: 'Cette entreprise est fermée/radiée.'
      });
    }

    log(`✅ SIRET validé: ${entreprise.nom_complet || entreprise.nom_raison_sociale}`);

    // Retourner les données de l'entreprise
    return res.json({
      valid: true,
      companyName: entreprise.nom_complet || entreprise.nom_raison_sociale || 'Entreprise',
      address: entreprise.siege?.adresse || '',
      city: entreprise.siege?.commune || '',
      postalCode: entreprise.siege?.code_postal || '',
      siren: entreprise.siren,
      siret: siret,
      sector: entreprise.activite_principale || '',
      status: entreprise.etat_administratif === 'A' ? 'Actif' : 'Inactif'
    });

  } catch (error) {
    error('❌ Erreur vérification SIRET:', error);
    return res.status(500).json({ 
      valid: false,
      error: 'Erreur serveur lors de la vérification du SIRET.',
      details: error.message
    });
  }
});

export default router;