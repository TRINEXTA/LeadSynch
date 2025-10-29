import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';
import { Client } from '@googlemaps/google-maps-services-js';

const googleMapsClient = new Client({});
const GOOGLE_API_KEY = 'AIzaSyCbNyMZXznzh-tHNxI3akt6RcrERH3pYFg';

const SECTOR_TO_GOOGLE_TYPES = {
  juridique: ['lawyer', 'legal_services'],
  comptabilite: ['accounting', 'finance'],
  sante: ['doctor', 'dentist', 'pharmacy', 'physiotherapist'],
  informatique: ['computer_store', 'electronics_store'],
  btp: ['general_contractor', 'electrician', 'plumber'],
  hotellerie: ['restaurant', 'cafe', 'hotel', 'bar'],
  immobilier: ['real_estate_agency'],
  logistique: ['moving_company', 'storage'],
  commerce: ['store', 'shopping_mall'],
  education: ['school', 'university'],
  consulting: ['business_consultant'],
  rh: ['employment_agency'],
  services: ['cleaning_service'],
  industrie: ['factory'],
  automobile: ['car_repair', 'car_dealer']
};

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    if (req.method === 'POST' && req.url.includes('/generate-leads')) {
      const { sector, city, radius = 10, quantity = 50 } = req.body;

      if (!sector || !city) {
        return res.status(400).json({ error: 'Secteur et ville requis' });
      }

      console.log(`🔍 Recherche: ${sector} à ${city}, rayon ${radius}km, quantité ${quantity}`);

      // 1. VÉRIFIER LES QUOTAS DISPONIBLES
      const quotaCheck = await queryAll(
        `SELECT 
          s.google_leads_quota,
          s.google_leads_used,
          (s.google_leads_quota - s.google_leads_used + 
           COALESCE(SUM(p.google_leads_remaining), 0)) AS available
        FROM subscriptions s
        LEFT JOIN one_shot_packs p ON s.tenant_id = p.tenant_id 
          AND p.status = 'active' 
          AND p.expires_at >= CURRENT_DATE
        WHERE s.tenant_id = $1
        GROUP BY s.id`,
        [tenant_id]
      );

      if (quotaCheck.length === 0) {
        return res.status(403).json({ 
          error: 'Aucun abonnement trouvé' 
        });
      }

      const available = quotaCheck[0].available;

      console.log(`💳 Quota disponible: ${available} leads Google`);

      if (available < quantity) {
        console.log(`❌ QUOTA INSUFFISANT: demandé ${quantity}, disponible ${available}`);
        return res.status(403).json({
          error: 'Quota insuffisant',
          available,
          requested: quantity,
          message: `Vous ne pouvez générer que ${available} leads Google Maps`
        });
      }

      // 2. Chercher dans la base globale
      const existingLeads = await queryAll(
        `SELECT * FROM global_leads 
         WHERE industry = $1 
         AND city ILIKE $2 
         LIMIT $3`,
        [sector, `%${city}%`, quantity]
      );

      const foundCount = existingLeads.length;
      const missingCount = Math.max(0, Math.min(quantity - foundCount, available));

      console.log(`✅ ${foundCount} leads en base, il manque ${missingCount}`);

      let newLeads = [];
      let googleLeadsGenerated = 0;

      // 3. Si manque des leads ET quota disponible, chercher sur Google Maps
      if (missingCount > 0) {
        const googleTypes = SECTOR_TO_GOOGLE_TYPES[sector] || ['establishment'];
        
        for (const type of googleTypes) {
          if (googleLeadsGenerated >= missingCount) break;

          try {
            console.log(`🔍 Google Maps: recherche ${type} à ${city}`);

            const response = await googleMapsClient.textSearch({
              params: {
                query: `${type} ${city}`,
                radius: radius * 1000,
                key: GOOGLE_API_KEY,
                language: 'fr'
              }
            });

            const places = response.data.results || [];
            console.log(`📍 ${places.length} résultats Google Maps`);

            for (const place of places) {
              if (googleLeadsGenerated >= missingCount) break;

              const existing = await queryAll(
                'SELECT id FROM global_leads WHERE google_place_id = $1',
                [place.place_id]
              );

              if (existing.length > 0) {
                console.log(`⏭️  Skip: ${place.name} (déjà en base)`);
                continue;
              }

              try {
                const detailsResponse = await googleMapsClient.placeDetails({
                  params: {
                    place_id: place.place_id,
                    fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'types'],
                    key: GOOGLE_API_KEY,
                    language: 'fr'
                  }
                });

                const details = detailsResponse.data.result;

                const newLead = await execute(
                  `INSERT INTO global_leads 
                  (company_name, phone, website, address, city, latitude, longitude, 
                   industry, google_place_id, google_types, rating, review_count, 
                   source, first_discovered_by, last_verified_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                  RETURNING *`,
                  [
                    details.name,
                    details.formatted_phone_number || null,
                    details.website || null,
                    details.formatted_address || null,
                    city,
                    details.geometry?.location?.lat || null,
                    details.geometry?.location?.lng || null,
                    sector,
                    place.place_id,
                    JSON.stringify(details.types || []),
                    details.rating || null,
                    details.user_ratings_total || null,
                    'google_maps',
                    tenant_id
                  ]
                );

                newLeads.push(newLead);
                googleLeadsGenerated++;
                
                console.log(`✅ Ajouté: ${details.name}`);

              } catch (detailsError) {
                console.error(`Erreur détails ${place.name}:`, detailsError.message);
              }
            }

          } catch (searchError) {
            console.error(`Erreur recherche ${type}:`, searchError.message);
          }
        }
      }

      // 4. CONSOMMER LES QUOTAS (décrémenter)
      if (googleLeadsGenerated > 0) {
        await execute(
          `UPDATE subscriptions 
           SET google_leads_used = google_leads_used + $1,
               updated_at = NOW()
           WHERE tenant_id = $2`,
          [googleLeadsGenerated, tenant_id]
        );

        // Enregistrer dans l'historique
        await execute(
          `INSERT INTO usage_history (tenant_id, action_type, quantity, cost)
           VALUES ($1, 'google_lead', $2, $3)`,
          [tenant_id, googleLeadsGenerated, googleLeadsGenerated * 1.0]
        );

        console.log(`💳 ${googleLeadsGenerated} crédits Google consommés`);
      }

      const totalLeads = [...existingLeads, ...newLeads];

      return res.json({
        success: true,
        found_in_database: foundCount,
        fetched_from_google: googleLeadsGenerated,
        total: totalLeads.length,
        quota_consumed: googleLeadsGenerated,
        quota_remaining: available - googleLeadsGenerated,
        leads: totalLeads.slice(0, quantity)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Generate leads error:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}

export default authMiddleware(handler);
