import { log, error, warn } from "../lib/logger.js";
﻿import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { queryAll, execute } from '../lib/db.js';
import { Client } from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// ==================== VALIDATION SCHEMA ====================
const generateLeadsSchema = z.object({
  sector: z.string().min(1, 'Secteur requis'),
  city: z.string().min(1, 'Ville requise'),
  radius: z.number().min(1).max(50).optional().default(10),
  quantity: z.number().min(1).max(200).optional().default(50)
});

const googleMapsClient = new Client({});
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

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

  try {
    if (req.method === 'POST' && req.url.includes('/generate-leads')) {
      // ✅ VALIDATION ZOD
      let validatedData;
      try {
        validatedData = generateLeadsSchema.parse(req.body);
      } catch (error) {
        return res.status(400).json({
          error: 'Données invalides',
          details: error.errors?.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }

      const { sector, city, radius, quantity } = validatedData;

      log(`🔍 Recherche intelligente: ${sector} à ${city}, rayon ${radius}km, quantité ${quantity}`);

      // Super admin bypass pour les crédits
      const isSuperAdmin = req.user.is_super_admin === true;

      // 1. VÉRIFIER LES CRÉDITS DISPONIBLES (sauf super admin)
      if (!isSuperAdmin) {
        const creditCheck = await queryAll(
          `SELECT credits_remaining FROM lead_credits WHERE tenant_id = $1`,
          [tenant_id]
        );

        if (creditCheck.length === 0) {
          // Initialiser si n'existe pas
          await execute(
            `INSERT INTO lead_credits (tenant_id, credits_remaining) VALUES ($1, 0)`,
            [tenant_id]
          );
          return res.status(402).json({
            error: 'Crédits insuffisants',
            message: 'Vous n\'avez pas de crédits. Veuillez acheter des crédits pour générer des leads.',
            credits_remaining: 0
          });
        }

        const creditsAvailable = creditCheck[0].credits_remaining;
        log(`💳 Crédits disponibles: ${creditsAvailable}`);

        if (creditsAvailable < quantity) {
          return res.status(402).json({
            error: 'Crédits insuffisants',
            credits_remaining: creditsAvailable,
            credits_needed: quantity,
            message: `Vous avez ${creditsAvailable} crédits disponibles mais ${quantity} sont nécessaires.`
          });
        }
      } else {
        log(`👑 Super admin - bypass vérification crédits`);
      }

      // 2. RECHERCHE INTELLIGENTE: D'ABORD LA BASE DE DONNÉES (0.03€)
      const existingLeads = await queryAll(
        `SELECT * FROM global_leads
         WHERE industry = $1 AND city ILIKE $2
         ORDER BY last_verified_at DESC NULLS LAST
         LIMIT $3`,
        [sector, `%${city}%`, quantity]
      );

      const foundInDatabase = existingLeads.length;
      const missingCount = quantity - foundInDatabase;

      log(`✅ ${foundInDatabase} prospects trouvés en base (0.05€/prospect)`);
      log(`🔍 ${missingCount} prospects manquants, recherche Google Maps (0.05€/prospect)`);

      let newLeads = [];
      let googleLeadsGenerated = 0;
      let creditsConsumed = 0;
      let totalCost = 0;

      // Consommer les crédits pour les prospects de la base (0.05€) - sauf super admin
      if (foundInDatabase > 0 && !isSuperAdmin) {
        const dbCost = foundInDatabase * 0.05;
        creditsConsumed += foundInDatabase;
        totalCost += dbCost;

        // Enregistrer l'usage pour les leads de la base
        for (const lead of existingLeads) {
          await execute(
            `INSERT INTO credit_usage (tenant_id, lead_id, credits_used, source, cost_euros)
             VALUES ($1, $2, 1, 'database', 0.05)`,
            [tenant_id, lead.id]
          );
        }

        log(`💰 ${foundInDatabase} crédits consommés (BDD): ${dbCost.toFixed(2)}€`);
      }

      // 3. GÉNÉRER DEPUIS GOOGLE MAPS API (0.05€) SI NÉCESSAIRE
      if (missingCount > 0) {
        if (!GOOGLE_API_KEY) {
          log(`⚠️ Pas de clé Google Maps API configurée, seulement ${foundInDatabase} leads retournés`);
        } else {
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

                  // Enregistrer l'usage pour ce prospect Google Maps (0.05€) - sauf super admin
                  if (!isSuperAdmin) {
                    await execute(
                      `INSERT INTO credit_usage (tenant_id, lead_id, credits_used, source, cost_euros)
                       VALUES ($1, $2, 1, 'google_maps', 0.05)`,
                      [tenant_id, newLead.id]
                    );
                    creditsConsumed++;
                    totalCost += 0.05;
                    log(`💰 1 crédit consommé (Google Maps): 0.05€`);
                  }

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
      }

      // 4. METTRE À JOUR LES CRÉDITS RESTANTS (sauf super admin)
      if (creditsConsumed > 0 && !isSuperAdmin) {
        await execute(
          `UPDATE lead_credits
           SET credits_remaining = credits_remaining - $1,
               credits_used = credits_used + $1,
               updated_at = NOW()
           WHERE tenant_id = $2`,
          [creditsConsumed, tenant_id]
        );

        log(`💳 Total crédits consommés: ${creditsConsumed} (${totalCost.toFixed(2)}€)`);
      }

      const totalLeads = [...existingLeads, ...newLeads];

      return res.json({
        success: true,
        found_in_database: foundInDatabase,
        fetched_from_google: googleLeadsGenerated,
        total: totalLeads.length,
        credits_consumed: isSuperAdmin ? 0 : creditsConsumed,
        cost_per_prospect: 0.05,
        total_cost: isSuperAdmin ? '0.00' : totalCost.toFixed(2),
        credits_remaining: isSuperAdmin ? 999999 : (creditsAvailable - creditsConsumed),
        unlimited: isSuperAdmin || undefined,
        leads: totalLeads.slice(0, quantity)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    error('Generate leads error:', err);
    return res.status(500).json({
      error: 'Server error',
      details: err.message
    });
  }
}

export default authMiddleware(handler);

