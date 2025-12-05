import { log, error, warn } from "../lib/logger.js";
﻿import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';
import { Client } from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const googleMapsClient = new Client({});
// Accepter GOOGLE_MAPS_API_KEY ou GOOGLE_API_KEY pour compatibilité
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

// Validation : la clé API doit être définie
if (!GOOGLE_API_KEY) {
  error('❌ GOOGLE_MAPS_API_KEY ou GOOGLE_API_KEY non configurée dans les variables d\'environnement');
  error('💡 Veuillez ajouter GOOGLE_MAPS_API_KEY=votre_clé dans le fichier .env');
}

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

    log(`🔍 Scraping emails sur: ${cleanUrl}`);

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
    log(`📧 ${foundEmails.length} emails trouvés: ${foundEmails.join(', ')}`);
    return foundEmails;

  } catch (error) {
    log(`❌ Erreur scraping ${url}:`, error.message);
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

    log(`💡 Emails générés pour ${domain}:`, patterns);
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
      log(`🎯 Hunter.io trouvé: ${email}`);
      return email;
    }

  } catch (error) {
    log(`❌ Hunter.io erreur:`, error.message);
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

  // Utiliser originalUrl pour supporter Express et Vercel
  const url = req.originalUrl || req.url || '';

  try {
    // ⚠️ LEGACY: Génération synchrone (non utilisé - le frontend utilise le streaming ci-dessous)
    // Ce bloc est gardé pour compatibilité mais devrait être supprimé à terme
    if (req.method === 'POST' && url.includes('/generate-leads') && !url.includes('stream')) {
      const { sector, city, radius = 10, quantity = 50 } = req.body;

      if (!sector || !city) {
        return res.status(400).json({ error: 'Secteur et ville requis' });
      }

      log(`🔍 Recherche: ${sector} à ${city}, rayon ${radius}km, quantité ${quantity}`);

      // 1. VÉRIFIER LES QUOTAS (système basé sur tenants.plan)
      const LEGACY_PLAN_QUOTAS = {
        'FREE': { google_leads_quota: 10 },
        'STARTER': { google_leads_quota: 100 },
        'PRO': { google_leads_quota: 500 },
        'BUSINESS': { google_leads_quota: -1 }
      };

      const tenantResult = await queryAll(
        `SELECT plan FROM tenants WHERE id = $1`,
        [tenant_id]
      );

      if (tenantResult.length === 0) {
        return res.status(403).json({ error: 'Tenant non trouvé' });
      }

      const plan = tenantResult[0].plan || 'FREE';
      const planQuotas = LEGACY_PLAN_QUOTAS[plan] || LEGACY_PLAN_QUOTAS['FREE'];

      let available = -1; // -1 = illimité
      if (planQuotas.google_leads_quota !== -1) {
        const usageResult = await queryAll(
          `SELECT COALESCE(SUM(credits_used), 0) as total
           FROM credit_usage
           WHERE tenant_id = $1 AND source = 'google_maps'
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          [tenant_id]
        );
        const creditsResult = await queryAll(
          `SELECT COALESCE(credits_remaining, 0) as credits FROM lead_credits WHERE tenant_id = $1`,
          [tenant_id]
        );
        const used = parseInt(usageResult[0]?.total || 0);
        const bonusCredits = parseInt(creditsResult[0]?.credits || 0);
        available = Math.max(0, planQuotas.google_leads_quota - used + bonusCredits);
      }

      log(`💳 Quota disponible: ${available === -1 ? 'illimité' : available} leads Google`);

      if (available !== -1 && available < quantity) {
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

      log(`✅ ${foundCount} leads en base, il manque ${missingCount}`);

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
                log(`📧 Recherche emails pour: ${details.name}`);
                const emails = await enrichLeadWithEmail(details.name, details.website);
                const primaryEmail = emails[0] || null;
                const allEmails = emails.join(', ');

                log(`✅ ${emails.length} emails trouvés: ${allEmails || 'aucun'}`);

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
                error(`Erreur détails:`, detailsError.message);
              }
            }

          } catch (searchError) {
            error(`Erreur recherche:`, searchError.message);
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
    if (req.method === 'POST' && (url.includes('/generate-leads-stream') || url === '/')) {
      const { sector, city, radius = 10, quantity = 50, searchId } = req.body;

      if (!sector || !city) {
        return res.status(400).json({ error: 'Parametres manquants' });
      }

      // Vérifier si l'utilisateur est super admin (pas de limite de quota)
      const isSuperAdmin = req.user.is_super_admin === true;

      // Définition des quotas par plan
      const PLAN_QUOTAS = {
        'FREE': { google_leads_quota: 10 },
        'STARTER': { google_leads_quota: 100 },
        'PRO': { google_leads_quota: 500 },
        'BUSINESS': { google_leads_quota: -1 } // illimité
      };

      // Vérification quota (sauf pour super admin)
      if (!isSuperAdmin) {
        // Récupérer le plan du tenant
        const tenantResult = await queryAll(
          `SELECT plan FROM tenants WHERE id = $1`,
          [tenant_id]
        );

        if (tenantResult.length === 0) {
          return res.status(403).json({
            error: 'Tenant non trouvé',
            message: 'Votre compte n\'est pas correctement configuré.',
            action: 'contact_support',
            redirect: '/support'
          });
        }

        const plan = tenantResult[0].plan || 'FREE';
        const planQuotas = PLAN_QUOTAS[plan] || PLAN_QUOTAS['FREE'];

        // Si plan illimité, pas besoin de vérifier
        if (planQuotas.google_leads_quota !== -1) {
          // Récupérer l'utilisation ce mois depuis credit_usage
          const usageResult = await queryAll(
            `SELECT COALESCE(SUM(credits_used), 0) as total
             FROM credit_usage
             WHERE tenant_id = $1 AND source = 'google_maps'
             AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [tenant_id]
          );

          // Récupérer les crédits bonus achetés
          const creditsResult = await queryAll(
            `SELECT COALESCE(credits_remaining, 0) as credits FROM lead_credits WHERE tenant_id = $1`,
            [tenant_id]
          );

          const used = parseInt(usageResult[0]?.total || 0);
          const bonusCredits = parseInt(creditsResult[0]?.credits || 0);
          const available = Math.max(0, planQuotas.google_leads_quota - used + bonusCredits);

          log(`💳 Quota pour ${req.user.email}: Plan ${plan}, Utilisé ${used}/${planQuotas.google_leads_quota}, Bonus ${bonusCredits}, Disponible ${available}`);

          if (available < quantity) {
            return res.status(403).json({
              error: 'Quota insuffisant',
              message: `Vous avez ${available} crédit(s) restant(s) mais vous demandez ${quantity} leads. Achetez des crédits supplémentaires ou upgradez votre plan.`,
              available,
              requested: quantity,
              plan: plan,
              action: 'buy_credits',
              redirect: '/settings/billing'
            });
          }
        } else {
          log(`💳 Plan ${plan} avec quotas illimités pour ${req.user.email}`);
        }
      } else {
        log(`👑 Super admin ${req.user.email} - pas de limite de quota`);
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

        log(`🔍 Recherche: sector=${sector}, city=${city}, quantity=${quantity}`);

        const existingLeads = await queryAll(
          `SELECT * FROM global_leads WHERE industry = $1 AND city ILIKE $2 ORDER BY last_verified_at DESC LIMIT $3`,
          [sector, `%${city}%`, quantity]
        );

        const foundCount = existingLeads.length;
        const missingCount = quantity - foundCount;

        log(`📊 Résultat cache: foundCount=${foundCount}, missingCount=${missingCount}`);
        log(`🔑 GOOGLE_API_KEY configurée: ${GOOGLE_API_KEY ? 'OUI (' + GOOGLE_API_KEY.substring(0, 10) + '...)' : 'NON ❌'}`);

        sendProgress({ type: 'cache_results', percent: 30, found: foundCount, missing: missingCount, leads: existingLeads });

        // Déclaration en dehors du bloc if pour être accessible partout
        let generated = 0;

        if (missingCount > 0 && searchState.active) {
          log(`🌐 Lancement recherche Google Maps (${missingCount} leads manquants)`);

          if (!GOOGLE_API_KEY) {
            error('❌ GOOGLE_API_KEY non configurée - impossible de chercher sur Google Maps');
            sendProgress({ type: 'error', message: 'Clé API Google Maps non configurée' });
            res.end();
            return;
          }

          const googleTypes = SECTOR_TO_GOOGLE_TYPES[sector] || ['establishment'];
          log(`📍 Types Google à rechercher: ${googleTypes.join(', ')}`);

          for (const type of googleTypes) {
            if (!searchState.active || generated >= missingCount) break;

            while (searchState.paused && searchState.active) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            log(`🔎 Recherche Google: "${type} ${city}" (rayon: ${radius}km)`);
            sendProgress({ type: 'progress', percent: 35, message: `Recherche Google Maps: ${type}...` });

            let googleResults = [];
            try {
              log(`📡 Appel Google textSearch avec query="${type} ${city}"`);
              const response = await googleMapsClient.textSearch({
                params: { query: `${type} ${city}`, radius: radius * 1000, key: GOOGLE_API_KEY, language: 'fr' }
              });
              googleResults = response.data.results || [];
              log(`✅ Google retourne ${googleResults.length} résultats pour "${type}"`);

              if (googleResults.length === 0) {
                log(`⚠️ Aucun résultat Google pour "${type} ${city}" - essai du type suivant`);
                sendProgress({ type: 'progress', percent: 40, message: `Aucun résultat pour ${type}, recherche suivante...` });
              }
            } catch (googleError) {
              error(`❌ Erreur Google Maps API pour "${type}":`, googleError.message);
              if (googleError.response?.status === 403 || googleError.message.includes('403')) {
                error('❌ Google Maps 403 - Clé API invalide ou Places API non activée');
                error('   Clé utilisée:', GOOGLE_API_KEY?.substring(0, 15) + '...');
                sendProgress({ type: 'error', message: 'Erreur Google Maps API (403) - Vérifiez que votre clé API est valide et que l\'API Places est activée dans la Google Cloud Console' });
                res.end();
                return;
              }
              // Continuer avec les autres types si erreur non fatale
              continue;
            }

            for (const place of googleResults) {
              if (!searchState.active || generated >= missingCount) break;

              while (searchState.paused && searchState.active) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              const existing = await queryAll('SELECT id FROM global_leads WHERE google_place_id = $1', [place.place_id]);
              if (existing.length > 0) {
                log(`⏭️ Skip "${place.name}" - déjà en base (place_id: ${place.place_id.substring(0, 20)}...)`);
                continue;
              }
              log(`🆕 Traitement nouveau lieu: "${place.name}"`);
              sendProgress({ type: 'progress', percent: 45 + Math.floor((generated / missingCount) * 45), message: `Analyse: ${place.name}...` });

              try {
                const detailsResponse = await googleMapsClient.placeDetails({
                  params: { place_id: place.place_id, fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'types'], key: GOOGLE_API_KEY, language: 'fr' }
                });

                const details = detailsResponse.data.result;
                const emails = await enrichLeadWithEmail(details.name, details.website);

                const result = await execute(
                  `INSERT INTO global_leads (company_name, phone, website, email, all_emails, address, city, latitude, longitude, industry, google_place_id, google_types, rating, review_count, source, first_discovered_by, last_verified_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()) RETURNING *`,
                  [details.name, details.formatted_phone_number || null, details.website || null, emails[0] || null, emails.join(', ') || null, details.formatted_address || null, city, details.geometry?.location?.lat || null, details.geometry?.location?.lng || null, sector, place.place_id, JSON.stringify(details.types || []), details.rating || null, details.user_ratings_total || null, 'google_maps', tenant_id]
                );

                generated++;
                const percent = 30 + Math.floor((generated / missingCount) * 60);
                const newLead = result.rows[0];
                log(`✅ Lead inséré: "${newLead?.company_name}" (${generated}/${missingCount})`);
                sendProgress({ type: 'new_lead', percent, generated, total: foundCount + generated, lead: newLead });

              } catch (error) {
                error(`❌ Erreur traitement "${place.name}":`, error.message);
                // Continuer avec le lieu suivant
              }
            }
          }
        }

        const totalLeads = foundCount + (missingCount > 0 ? generated : 0);

        if (missingCount <= 0) {
          log(`✅ Tous les leads demandés (${quantity}) trouvés en cache, pas besoin de Google Maps`);
        } else {
          log(`📈 Génération terminée: ${generated} nouveaux leads générés via Google Maps`);
        }

        // Message de fin plus informatif
        let completeMessage = `Terminé ! ${totalLeads} leads trouvés`;
        if (totalLeads === 0) {
          completeMessage = 'Aucun lead trouvé pour cette recherche. Essayez un autre secteur ou une autre ville.';
          log(`⚠️ Recherche terminée sans résultats pour ${sector} à ${city}`);
        } else if (foundCount > 0 && generated === 0) {
          completeMessage = `${foundCount} leads trouvés en cache (déjà enregistrés)`;
        } else if (foundCount === 0 && generated > 0) {
          completeMessage = `${generated} nouveaux leads générés via Google Maps`;
        }

        sendProgress({ type: 'complete', percent: 100, total: totalLeads, message: completeMessage, fromCache: foundCount, generated: generated });
        res.end();
        return;

      } catch (error) {
        error('❌ ERREUR GENERATION:', error.message);
        error('❌ Stack:', error.stack);

        // Identifier la source de l'erreur pour un message plus clair
        let userMessage = error.message;

        if (error.message.includes('403')) {
          if (error.config?.url?.includes('maps.googleapis.com')) {
            userMessage = 'Erreur Google Maps API (403) - Vérifiez que la clé API est valide et que l\'API Places est activée';
            error('❌ Google Maps API Error - Clé:', GOOGLE_API_KEY?.substring(0, 15) + '...');
          } else if (error.config?.url?.includes('hunter.io')) {
            userMessage = 'Erreur Hunter.io API (403) - Clé API invalide ou quota dépassé';
          } else {
            userMessage = 'Erreur 403 lors du scraping d\'un site web - Site protégé';
          }
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
          userMessage = 'Erreur de connexion - Vérifiez votre connexion internet';
        } else if (error.message.includes('Invalid API key')) {
          userMessage = 'Clé API Google Maps invalide';
        }

        error('❌ Message envoyé au frontend:', userMessage);
        sendProgress({ type: 'error', message: userMessage });
        res.end();
        return;
      } finally {
        activeSearches.delete(searchId);
      }
    }

    // PAUSE/RESUME/STOP
    if (req.method === 'POST' && (url.includes('/pause-search') || url === '/')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) { search.paused = true; return res.json({ success: true, paused: true }); }
      return res.status(404).json({ error: 'Search not found' });
    }
    if (req.method === 'POST' && (url.includes('/resume-search') || url === '/')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) { search.paused = false; return res.json({ success: true, paused: false }); }
      return res.status(404).json({ error: 'Search not found' });
    }
    if (req.method === 'POST' && (url.includes('/stop-search') || url === '/')) {
      const { searchId } = req.body;
      const search = activeSearches.get(searchId);
      if (search) { search.active = false; activeSearches.delete(searchId); return res.json({ success: true, stopped: true }); }
      return res.status(404).json({ error: 'Search not found' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    error('Generate leads error:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}

export default authMiddleware(handler);


