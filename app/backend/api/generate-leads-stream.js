import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';
import { Client } from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const googleMapsClient = new Client({});
const GOOGLE_API_KEY = 'AIzaSyCbNyMZXznzh-tHNxI3akt6RcrERH3pYFg';

const activeSearches = new Map();

// Configuration Hunter.io (optionnel)
const HUNTER_API_KEY = process.env.HUNTER_API_KEY || null;

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

/**
 * Extraire les emails d'une page web
 */
/**
 * Extraire les emails d'une page web
 */
async function scrapeEmailsFromWebsite(url) {
  if (!url) return [];
  
  try {
    let cleanUrl = url;
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    console.log(`🔍 Scraping emails sur: ${cleanUrl}`);

    const response = await axios.get(cleanUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = new Set();

    const textEmails = html.match(emailRegex) || [];
    textEmails.forEach(email => {
      const cleanEmail = email.replace(/^[0-9\s\-\.\(\)]+/, '');
      
      if (cleanEmail.includes('@') &&
          !cleanEmail.includes('example.com') && 
          !cleanEmail.includes('domain.com') && 
          !cleanEmail.includes('yourdomain') &&
          !cleanEmail.includes('wix.com') &&
          !cleanEmail.includes('wordpress.com') &&
          !cleanEmail.includes('sentry.io') &&
          !cleanEmail.includes('ingest.') &&
          !cleanEmail.includes('o38419') &&
          !cleanEmail.includes('@2x.') &&
          !cleanEmail.includes('@3x.') &&
          !cleanEmail.match(/^[0-9]+/) &&
          !cleanEmail.match(/[a-f0-9]{32,}@/) &&
          !cleanEmail.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|doc|docx)$/i) &&
          !cleanEmail.match(/@[a-z0-9-]+\.(png|jpg|jpeg|gif|svg|webp)/i) &&
          cleanEmail.length > 5 &&
          cleanEmail.split('@')[0].length >= 2) {
        emails.add(cleanEmail.toLowerCase());
      }
    });

    $('a[href^="mailto:"]').each((i, elem) => {
      const mailto = $(elem).attr('href');
      const email = mailto.replace('mailto:', '').split('?')[0];
      if (email && email.includes('@') && !email.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
        emails.add(email.toLowerCase());
      }
    });

    $('[data-email], [data-mail]').each((i, elem) => {
      const email = $(elem).attr('data-email') || $(elem).attr('data-mail');
      if (email && email.includes('@') && !email.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
        emails.add(email.toLowerCase());
      }
    });

    const foundEmails = Array.from(emails);
    console.log(`📧 ${foundEmails.length} emails trouvés: ${foundEmails.join(', ')}`);
    return foundEmails;

  } catch (error) {
    console.log(`❌ Erreur scraping ${url}:`, error.message);
    return [];
  }
}

/**
 * Générer des emails probables basés sur le nom de l'entreprise
 */
function generateCommonEmails(companyName, website) {
  if (!website) return [];

  try {
    const domain = new URL(website.startsWith('http') ? website : 'https://' + website).hostname;
    
    const patterns = [
      `contact@${domain}`,
      `info@${domain}`,
      `hello@${domain}`,
      `bonjour@${domain}`,
      `commercial@${domain}`,
      `vente@${domain}`,
      `accueil@${domain}`,
      `reception@${domain}`
    ];

    console.log(`💡 Emails générés pour ${domain}:`, patterns);
    return patterns;

  } catch (error) {
    return [];
  }
}

/**
 * Utiliser Hunter.io pour trouver l'email
 */
async function findEmailWithHunter(domain) {
  if (!HUNTER_API_KEY || !domain) return null;

  try {
    const response = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: {
        domain: domain,
        api_key: HUNTER_API_KEY,
        limit: 1
      },
      timeout: 5000
    });

    if (response.data.data.emails && response.data.data.emails.length > 0) {
      const email = response.data.data.emails[0].value;
      console.log(`🎯 Hunter.io trouvé: ${email}`);
      return email;
    }

  } catch (error) {
    console.log(`❌ Hunter.io erreur:`, error.message);
  }

  return null;
}

/**
 * Enrichir un lead avec des emails
 */
async function enrichLeadWithEmail(companyName, website) {
  const emails = [];

  // 1. Scraper le site web
  if (website) {
    const scrapedEmails = await scrapeEmailsFromWebsite(website);
    emails.push(...scrapedEmails);
  }

  // 2. Utiliser Hunter.io (si configuré)
  if (website && HUNTER_API_KEY) {
    try {
      const domain = new URL(website.startsWith('http') ? website : 'https://' + website).hostname;
      const hunterEmail = await findEmailWithHunter(domain);
      if (hunterEmail) {
        emails.push(hunterEmail);
      }
    } catch (e) {}
  }

  // 3. Générer des emails courants
  const commonEmails = generateCommonEmails(companyName, website);
  emails.push(...commonEmails);

  // Dédupliquer et retourner
  return [...new Set(emails)];
}

async function handler(req, res) {
  const tenant_id = req.user.tenant_id;

  try {
    if (req.method === 'POST' && req.url.includes('/generate-leads')) {
      const { sector, city, radius = 10, quantity = 50 } = req.body;

      if (!sector || !city) {
        return res.status(400).json({ error: 'Secteur et ville requis' });
      }

      console.log(`🔍 Recherche: ${sector} à ${city}, rayon ${radius}km, quantité ${quantity}`);

      // 1. VÉRIFIER LES QUOTAS
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
        return res.status(403).json({ error: 'Aucun abonnement trouvé' });
      }

      const available = quotaCheck[0].available;
      console.log(`💳 Quota disponible: ${available} leads Google`);

      if (available < quantity) {
        return res.status(403).json({
          error: 'Quota insuffisant',
          available,
          requested: quantity
        });
      }

      // 2. Chercher dans la base
      const existingLeads = await queryAll(
        `SELECT * FROM global_leads 
         WHERE industry = $1 AND city ILIKE $2 LIMIT $3`,
        [sector, `%${city}%`, quantity]
      );

      const foundCount = existingLeads.length;
      const missingCount = Math.max(0, Math.min(quantity - foundCount, available));

      console.log(`✅ ${foundCount} leads en base, il manque ${missingCount}`);

      let newLeads = [];
      let googleLeadsGenerated = 0;

      // 3. Générer depuis Google Maps
      if (missingCount > 0) {
        const googleTypes = SECTOR_TO_GOOGLE_TYPES[sector] || ['establishment'];
        
        for (const type of googleTypes) {
          if (googleLeadsGenerated >= missingCount) break;

          try {
            const response = await googleMapsClient.textSearch({
              params: {
                query: `${type} ${city}`,
                radius: radius * 1000,
                key: GOOGLE_API_KEY,
                language: 'fr'
              }
            });

            const places = response.data.results || [];

            for (const place of places) {
              if (googleLeadsGenerated >= missingCount) break;

              const existing = await queryAll(
                'SELECT id FROM global_leads WHERE google_place_id = $1',
                [place.place_id]
              );

              if (existing.length > 0) continue;

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

                // 🔥 ENRICHIR AVEC LES EMAILS
                console.log(`📧 Recherche emails pour: ${details.name}`);
                const emails = await enrichLeadWithEmail(details.name, details.website);
                const primaryEmail = emails[0] || null;
                const allEmails = emails.join(', ');

                console.log(`✅ ${emails.length} emails trouvés: ${allEmails || 'aucun'}`);

                const newLead = await execute(
                  `INSERT INTO global_leads 
                  (company_name, phone, website, email, all_emails, address, city, 
                   latitude, longitude, industry, google_place_id, google_types, 
                   rating, review_count, source, first_discovered_by, last_verified_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
                  RETURNING *`,
                  [
                    details.name,
                    details.formatted_phone_number || null,
                    details.website || null,
                    primaryEmail,
                    allEmails || null,
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

              } catch (detailsError) {
                console.error(`Erreur détails:`, detailsError.message);
              }
            }

          } catch (searchError) {
            console.error(`Erreur recherche:`, searchError.message);
          }
        }
      }

      // 4. Consommer les quotas
      if (googleLeadsGenerated > 0) {
        await execute(
          `UPDATE subscriptions 
           SET google_leads_used = google_leads_used + $1, updated_at = NOW()
           WHERE tenant_id = $2`,
          [googleLeadsGenerated, tenant_id]
        );

        await execute(
          `INSERT INTO usage_history (tenant_id, action_type, quantity, cost)
           VALUES ($1, 'google_lead', $2, $3)`,
          [tenant_id, googleLeadsGenerated, googleLeadsGenerated * 1.0]
        );
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

    
    // STREAMING AVEC SERVER-SENT EVENTS
    if (req.method === 'POST' && req.url.includes('/generate-leads-stream')) {
      const { sector, city, radius = 10, quantity = 50, searchId } = req.body;

      if (!sector || !city) {
        return res.status(400).json({ error: 'Parametres manquants' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const searchState = { active: true, paused: false, searchId };
      activeSearches.set(searchId, searchState);

      try {
        sendProgress({ type: 'start', message: 'Demarrage...' });
        sendProgress({ type: 'progress', percent: 10, message: 'Recherche en base...' });
        
        const existingLeads = await queryAll(
          `SELECT * FROM global_leads WHERE industry = return res.status(405) AND city ILIKE $2 ORDER BY last_verified_at DESC LIMIT $3`,
          [sector, `%${city}%`, quantity]
        );

        const foundCount = existingLeads.length;
        const missingCount = quantity - foundCount;

        sendProgress({ type: 'cache_results', percent: 30, found: foundCount, missing: missingCount, leads: existingLeads });

        if (missingCount > 0 && searchState.active) {
          let generated = 0;
          const googleTypes = SECTOR_TO_GOOGLE_TYPES[sector] || ['establishment'];
          
          for (const type of googleTypes) {
            if (!searchState.active || generated >= missingCount) break;

            while (searchState.paused && searchState.active) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            const response = await googleMapsClient.textSearch({
              params: { query: `${type} ${city}`, radius: radius * 1000, key: GOOGLE_API_KEY, language: 'fr' }
            });

            for (const place of (response.data.results || [])) {
              if (!searchState.active || generated >= missingCount) break;

              while (searchState.paused && searchState.active) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              const existing = await queryAll('SELECT id FROM global_leads WHERE google_place_id = return res.status(405)', [place.place_id]);
              if (existing.length > 0) continue;

              try {
                const detailsResponse = await googleMapsClient.placeDetails({
                  params: { place_id: place.place_id, fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'types'], key: GOOGLE_API_KEY, language: 'fr' }
                });

                const details = detailsResponse.data.result;
                const emails = await enrichLeadWithEmail(details.name, details.website);

                const result = await execute(
                  `INSERT INTO global_leads (company_name, phone, website, email, all_emails, address, city, latitude, longitude, industry, google_place_id, google_types, rating, review_count, source, first_discovered_by, last_verified_at)
                   VALUES (return res.status(405), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()) RETURNING *`,
                  [details.name, details.formatted_phone_number || null, details.website || null, emails[0] || null, emails.join(', ') || null, details.formatted_address || null, city, details.geometry?.location?.lat || null, details.geometry?.location?.lng || null, sector, place.place_id, JSON.stringify(details.types || []), details.rating || null, details.user_ratings_total || null, 'google_maps', tenant_id]
                );

                generated++;
                const percent = 30 + Math.floor((generated / missingCount) * 60);
                sendProgress({ type: 'new_lead', percent, generated, total: foundCount + generated, lead: result.rows[0] });

              } catch (error) {
                console.error('Erreur details:', error.message);
              }
            }
          }
        }

        sendProgress({ type: 'complete', percent: 100, total: foundCount + (missingCount > 0 ? generated : 0) });
        res.end();
        return;

      } catch (error) {
        sendProgress({ type: 'error', message: error.message });
        res.end();
        return;
      } finally {
        activeSearches.delete(searchId);
      }
    }

    // PAUSE/RESUME/STOP
    if (req.method === 'POST' && req.url.includes('/pause-search')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) { search.paused = true; return res.json({ success: true, paused: true }); }
      return res.status(404).json({ error: 'Search not found' });
    }
    if (req.method === 'POST' && req.url.includes('/resume-search')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) { search.paused = false; return res.json({ success: true, paused: false }); }
      return res.status(404).json({ error: 'Search not found' });
    }
    if (req.method === 'POST' && req.url.includes('/stop-search')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) { search.active = false; activeSearches.delete(searchId); return res.json({ success: true, stopped: true }); }
      return res.status(404).json({ error: 'Search not found' });
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


