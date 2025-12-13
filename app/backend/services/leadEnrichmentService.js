/**
 * LeadEnrichmentService - Service d'enrichissement de leads intelligent
 *
 * Pipeline de recherche :
 * 1. Base interne (leads du tenant + global_leads)
 * 2. API Sirene INSEE (GRATUIT - données officielles)
 * 3. Google Maps (localisation + contact)
 * 4. Scraping site web (emails, téléphones)
 * 5. Claude AI (analyse intelligente si nécessaire)
 *
 * @author LeadSynch
 * @version 2.0.0
 */

import { log, error, warn } from '../lib/logger.js';
import { queryAll, queryOne, execute } from '../lib/db.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // API Sirene (recherche entreprises gouv - GRATUIT)
  SIRENE_API_URL: 'https://recherche-entreprises.api.gouv.fr/search',

  // Timeout pour les requêtes HTTP
  HTTP_TIMEOUT: 5000,

  // Délai entre les requêtes (anti-spam)
  REQUEST_DELAY: 100,

  // Taille des batches pour traitement parallèle
  BATCH_SIZE: 10,

  // Données considérées obsolètes après X jours
  DATA_EXPIRY_DAYS: 90,

  // Score minimum pour considérer un lead comme "qualifié"
  MIN_QUALITY_SCORE: 50,

  // Patterns d'emails à ignorer
  IGNORE_EMAIL_PATTERNS: [
    'example.com', 'domain.com', 'test.com', 'localhost',
    'wix.com', 'wordpress.com', 'squarespace.com',
    'sentry.io', 'google.com', 'facebook.com',
    'noreply', 'no-reply', 'donotreply'
  ],

  // Domaines d'emails jetables (disposable)
  DISPOSABLE_EMAIL_DOMAINS: [
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'temp-mail.org',
    'throwaway.email', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
    'yopmail.com', 'maildrop.cc', 'getnada.com', 'tempail.com',
    'dispostable.com', 'sharklasers.com', 'guerrillamailblock.com',
    'emailondeck.com', 'tempr.email', 'discard.email', 'mailcatch.com',
    'jetable.org', 'mytrashmail.com', 'spamgourmet.com'
  ],

  // Domaines génériques (moins fiables pour contact business)
  GENERIC_EMAIL_DOMAINS: [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net',
    'aol.com', 'icloud.com', 'protonmail.com', 'gmx.com', 'mail.com'
  ]
};

// Mapping secteur -> code NAF
const SECTOR_TO_NAF = {
  informatique: ['62', '63'],
  juridique: ['69.1'],
  comptabilite: ['69.2'],
  sante: ['86'],
  btp: ['41', '42', '43'],
  hotellerie: ['55', '56'],
  immobilier: ['68'],
  commerce: ['47'],
  industrie: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'],
  transport: ['49', '50', '51', '52'],
  education: ['85'],
  consulting: ['70'],
  marketing: ['73'],
  rh: ['78']
};

// ============================================================
// CLASSE PRINCIPALE
// ============================================================

class LeadEnrichmentService {
  constructor(tenantId, userId = null) {
    this.tenantId = tenantId;
    this.userId = userId;
    this.stats = {
      fromInternalDb: 0,
      fromGlobalCache: 0,
      fromSirene: 0,
      fromGoogleMaps: 0,
      enriched: 0,
      errors: 0
    };
  }

  /**
   * Recherche principale de leads
   * @param {Object} params - Paramètres de recherche
   * @returns {Object} Résultats avec leads et statistiques
   */
  async searchLeads(params) {
    const { sector, city, quantity = 50, radius = 10 } = params;

    log(`🔍 [LeadEnrichment] Recherche: ${sector} à ${city}, qty=${quantity}`);

    const results = {
      leads: [],
      stats: { ...this.stats },
      sources: []
    };

    try {
      // ========== ÉTAPE 1: RECHERCHE INTERNE ==========
      log('📦 [Étape 1/4] Recherche base interne...');
      const internalLeads = await this.searchInternalDatabase(sector, city, quantity);

      if (internalLeads.length > 0) {
        results.leads.push(...internalLeads);
        results.sources.push('internal_db');
        this.stats.fromInternalDb = internalLeads.length;
        log(`✅ ${internalLeads.length} leads trouvés en interne`);
      }

      // Si on a assez de leads, on s'arrête
      if (results.leads.length >= quantity) {
        log(`✅ Quantité atteinte avec base interne uniquement`);
        results.stats = { ...this.stats };
        return results;
      }

      // ========== ÉTAPE 2: CACHE GLOBAL ==========
      log('🌐 [Étape 2/4] Recherche cache global...');
      const remaining = quantity - results.leads.length;
      const globalLeads = await this.searchGlobalCache(sector, city, remaining, results.leads);

      if (globalLeads.length > 0) {
        results.leads.push(...globalLeads);
        results.sources.push('global_cache');
        this.stats.fromGlobalCache = globalLeads.length;
        log(`✅ ${globalLeads.length} leads trouvés dans le cache global`);
      }

      // Si on a assez de leads, on s'arrête
      if (results.leads.length >= quantity) {
        log(`✅ Quantité atteinte avec cache global`);
        results.stats = { ...this.stats };
        return results;
      }

      // ========== ÉTAPE 3: API SIRENE (GRATUIT) ==========
      log('🏛️ [Étape 3/4] Recherche API Sirene INSEE...');
      const remaining2 = quantity - results.leads.length;
      const sireneLeads = await this.searchSireneAPI(sector, city, remaining2);

      if (sireneLeads.length > 0) {
        results.leads.push(...sireneLeads);
        results.sources.push('sirene_insee');
        this.stats.fromSirene = sireneLeads.length;
        log(`✅ ${sireneLeads.length} leads trouvés via API Sirene`);
      }

      // ========== ÉTAPE 4: ENRICHISSEMENT ==========
      log('🔬 [Étape 4/4] Enrichissement des leads...');
      results.leads = await this.enrichLeads(results.leads);
      this.stats.enriched = results.leads.filter(l => l.enriched).length;

      results.stats = { ...this.stats };
      log(`✅ Recherche terminée: ${results.leads.length} leads au total`);

      return results;

    } catch (err) {
      error('❌ [LeadEnrichment] Erreur:', err);
      this.stats.errors++;
      results.stats = { ...this.stats };
      return results;
    }
  }

  /**
   * Recherche dans la base interne du tenant
   */
  async searchInternalDatabase(sector, city, limit) {
    try {
      const leads = await queryAll(`
        SELECT DISTINCT ON (l.company_name, l.city)
          l.id, l.company_name, l.contact_name, l.email, l.phone,
          l.address, l.city, l.postal_code, l.website,
          l.sector, l.industry, l.siren, l.siret,
          l.employee_count, l.naf_code,
          l.created_at, l.updated_at,
          'internal_db' as source_type
        FROM leads l
        WHERE l.tenant_id = $1
          AND (l.sector ILIKE $2 OR l.industry ILIKE $2)
          AND l.city ILIKE $3
          AND l.status != 'lost'
        ORDER BY l.company_name, l.city, l.updated_at DESC
        LIMIT $4
      `, [this.tenantId, `%${sector}%`, `%${city}%`, limit]);

      return leads.map(l => ({ ...l, fromSource: 'internal_db' }));

    } catch (err) {
      error('Erreur recherche interne:', err);
      return [];
    }
  }

  /**
   * Recherche dans le cache global (tous tenants)
   */
  async searchGlobalCache(sector, city, limit, excludeLeads = []) {
    try {
      // Exclure les leads déjà trouvés (par nom + ville)
      const excludeNames = excludeLeads.map(l => l.company_name?.toLowerCase()).filter(Boolean);

      let query = `
        SELECT
          id, company_name, phone, website, email, all_emails,
          address, city, latitude, longitude,
          industry, google_place_id, google_types,
          rating, review_count, source,
          siret, siren, naf_code, employee_count,
          last_verified_at, created_at,
          'global_cache' as source_type
        FROM global_leads
        WHERE industry ILIKE $1
          AND city ILIKE $2
          AND (last_verified_at IS NULL OR last_verified_at > NOW() - INTERVAL '${CONFIG.DATA_EXPIRY_DAYS} days')
      `;

      const params = [`%${sector}%`, `%${city}%`];

      if (excludeNames.length > 0) {
        query += ` AND LOWER(company_name) NOT IN (${excludeNames.map((_, i) => `$${i + 3}`).join(', ')})`;
        params.push(...excludeNames);
      }

      query += ` ORDER BY last_verified_at DESC NULLS LAST LIMIT $${params.length + 1}`;
      params.push(limit);

      const leads = await queryAll(query, params);

      return leads.map(l => ({ ...l, fromSource: 'global_cache' }));

    } catch (err) {
      error('Erreur recherche cache global:', err);
      return [];
    }
  }

  /**
   * Recherche via API Sirene INSEE (GRATUIT)
   */
  async searchSireneAPI(sector, city, limit) {
    try {
      // Construire la requête
      const nafCodes = SECTOR_TO_NAF[sector] || [];
      let query = city;

      // Ajouter le secteur si on a un mapping NAF
      if (nafCodes.length > 0) {
        query = `${sector} ${city}`;
      }

      log(`🏛️ Appel API Sirene: q="${query}", limit=${limit}`);

      const response = await axios.get(CONFIG.SIRENE_API_URL, {
        params: {
          q: query,
          per_page: Math.min(limit, 25), // API limite à 25 par page
          page: 1
        },
        timeout: CONFIG.HTTP_TIMEOUT,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LeadSynch/2.0'
        }
      });

      if (!response.data?.results) {
        log('⚠️ API Sirene: aucun résultat');
        return [];
      }

      const leads = response.data.results.map(company => this.formatSireneResult(company, sector));

      log(`✅ API Sirene: ${leads.length} entreprises trouvées`);

      // Sauvegarder dans le cache global
      for (const lead of leads) {
        await this.saveToGlobalCache(lead);
      }

      return leads;

    } catch (err) {
      if (err.response?.status === 429) {
        warn('⚠️ API Sirene: Rate limit atteint');
      } else {
        error('Erreur API Sirene:', err.message);
      }
      return [];
    }
  }

  /**
   * Formater un résultat de l'API Sirene
   */
  formatSireneResult(company, sector) {
    const siege = company.siege || {};
    const dirigeants = company.dirigeants || [];

    return {
      company_name: company.nom_complet || company.nom_raison_sociale,
      siret: siege.siret || null,
      siren: company.siren || null,
      naf_code: company.activite_principale || null,
      naf_label: company.libelle_activite_principale || null,
      employee_count: this.parseEmployeeCount(company.tranche_effectif_salarie),
      employee_range: company.tranche_effectif_salarie || null,
      legal_form: company.nature_juridique || null,
      creation_date: company.date_creation || null,
      address: siege.adresse || null,
      city: siege.commune || null,
      postal_code: siege.code_postal || null,
      latitude: siege.latitude || null,
      longitude: siege.longitude || null,
      contact_name: dirigeants[0]?.nom_complet || null,
      contact_role: dirigeants[0]?.qualite || null,
      sector: sector,
      industry: company.libelle_activite_principale || sector,
      source: 'sirene_insee',
      fromSource: 'sirene_insee',
      status: company.etat_administratif === 'A' ? 'active' : 'inactive',
      // Ces champs seront enrichis plus tard
      email: null,
      phone: null,
      website: null,
      enriched: false
    };
  }

  /**
   * Parser le nombre d'employés
   */
  parseEmployeeCount(tranche) {
    if (!tranche) return null;

    const mapping = {
      '0 salarié': 0,
      '1 ou 2 salariés': 2,
      '3 à 5 salariés': 5,
      '6 à 9 salariés': 9,
      '10 à 19 salariés': 15,
      '20 à 49 salariés': 35,
      '50 à 99 salariés': 75,
      '100 à 199 salariés': 150,
      '200 à 249 salariés': 225,
      '250 à 499 salariés': 375,
      '500 à 999 salariés': 750,
      '1 000 à 1 999 salariés': 1500,
      '2 000 à 4 999 salariés': 3500,
      '5 000 à 9 999 salariés': 7500,
      '10 000 salariés et plus': 10000
    };

    return mapping[tranche] || null;
  }

  /**
   * Sauvegarder un lead dans le cache global
   */
  async saveToGlobalCache(lead) {
    try {
      // Vérifier si déjà existant (par SIRET ou nom+ville)
      let existing = null;

      if (lead.siret) {
        existing = await queryOne(
          'SELECT id FROM global_leads WHERE siret = $1',
          [lead.siret]
        );
      }

      if (!existing && lead.company_name && lead.city) {
        existing = await queryOne(
          'SELECT id FROM global_leads WHERE LOWER(company_name) = LOWER($1) AND LOWER(city) = LOWER($2)',
          [lead.company_name, lead.city]
        );
      }

      if (existing) {
        // Mise à jour
        await execute(`
          UPDATE global_leads SET
            siren = COALESCE($1, siren),
            siret = COALESCE($2, siret),
            naf_code = COALESCE($3, naf_code),
            employee_count = COALESCE($4, employee_count),
            address = COALESCE($5, address),
            postal_code = COALESCE($6, postal_code),
            latitude = COALESCE($7, latitude),
            longitude = COALESCE($8, longitude),
            last_verified_at = NOW()
          WHERE id = $9
        `, [
          lead.siren, lead.siret, lead.naf_code, lead.employee_count,
          lead.address, lead.postal_code, lead.latitude, lead.longitude,
          existing.id
        ]);

        return existing.id;
      }

      // Insertion
      const result = await execute(`
        INSERT INTO global_leads (
          company_name, phone, website, email, all_emails,
          address, city, postal_code, latitude, longitude,
          industry, siren, siret, naf_code, employee_count,
          source, first_discovered_by, last_verified_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        )
        ON CONFLICT (google_place_id) DO UPDATE SET
          siren = COALESCE(EXCLUDED.siren, global_leads.siren),
          siret = COALESCE(EXCLUDED.siret, global_leads.siret),
          naf_code = COALESCE(EXCLUDED.naf_code, global_leads.naf_code),
          last_verified_at = NOW()
        RETURNING id
      `, [
        lead.company_name, lead.phone, lead.website, lead.email, lead.all_emails,
        lead.address, lead.city, lead.postal_code, lead.latitude, lead.longitude,
        lead.industry || lead.sector, lead.siren, lead.siret, lead.naf_code, lead.employee_count,
        lead.source || 'sirene_insee', this.tenantId
      ]);

      return result.rows[0]?.id;

    } catch (err) {
      // Ignorer les erreurs de contrainte unique
      if (!err.message?.includes('duplicate') && !err.message?.includes('unique')) {
        error('Erreur sauvegarde cache global:', err.message);
      }
      return null;
    }
  }

  /**
   * Enrichir les leads avec données supplémentaires (traitement parallèle par batch)
   */
  async enrichLeads(leads, onProgress = null) {
    const enrichedLeads = [];
    const totalLeads = leads.length;
    const batchSize = CONFIG.BATCH_SIZE;

    log(`🔬 Enrichissement de ${totalLeads} leads (batch de ${batchSize})`);

    // Traiter par batches
    for (let i = 0; i < totalLeads; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalLeads / batchSize);

      log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} leads)`);

      // Traiter le batch en parallèle
      const batchResults = await Promise.allSettled(
        batch.map(lead => this.enrichSingleLead(lead))
      );

      // Collecter les résultats
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          enrichedLeads.push(result.value);
        } else {
          error(`Erreur enrichissement ${batch[j]?.company_name}:`, result.reason?.message);
          enrichedLeads.push({ ...batch[j], enriched: false, quality_score: 0 });
        }
      }

      // Callback de progression
      if (onProgress) {
        const progress = Math.round(((i + batch.length) / totalLeads) * 100);
        onProgress({
          processed: i + batch.length,
          total: totalLeads,
          percent: progress,
          batch: batchNumber,
          totalBatches
        });
      }

      // Petit délai entre les batches
      if (i + batchSize < totalLeads) {
        await this.delay(CONFIG.REQUEST_DELAY);
      }
    }

    log(`✅ Enrichissement terminé: ${enrichedLeads.filter(l => l.enriched).length}/${totalLeads} enrichis`);

    return enrichedLeads;
  }

  /**
   * Enrichir un seul lead
   */
  async enrichSingleLead(lead) {
    let enriched = { ...lead, enriched: false };

    // Si on a déjà email et téléphone, pas besoin d'enrichir
    if (lead.email && lead.phone) {
      enriched.enriched = true;
      enriched.quality_score = this.calculateQualityScore(enriched);
      return enriched;
    }

    // Tenter de trouver le site web si manquant
    if (!enriched.website && enriched.company_name) {
      enriched.website = await this.findWebsite(enriched.company_name, enriched.city);
    }

    // Scraper le site web pour email/téléphone
    if (enriched.website) {
      const scrapedData = await this.scrapeWebsite(enriched.website);

      if (scrapedData.emails.length > 0 && !enriched.email) {
        enriched.email = scrapedData.emails[0];
        enriched.all_emails = scrapedData.emails.join(', ');
      }

      if (scrapedData.phones.length > 0 && !enriched.phone) {
        enriched.phone = scrapedData.phones[0];
      }

      if (scrapedData.siret && !enriched.siret) {
        enriched.siret = scrapedData.siret;
      }
    }

    // Générer des emails probables si toujours pas d'email
    if (!enriched.email && enriched.website) {
      const domain = this.extractDomain(enriched.website);
      if (domain) {
        enriched.email = `contact@${domain}`;
        enriched.email_generated = true;
      }
    }

    enriched.enriched = true;
    enriched.quality_score = this.calculateQualityScore(enriched);

    // Mettre à jour le cache global
    if (enriched.fromSource === 'global_cache' || enriched.fromSource === 'sirene_insee') {
      await this.updateGlobalCacheWithEnrichment(enriched);
    }

    return enriched;
  }

  /**
   * Scraper un site web pour extraire email/téléphone
   */
  async scrapeWebsite(url) {
    const result = { emails: [], phones: [], siret: null };

    if (!url) return result;

    try {
      let cleanUrl = url;
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const response = await axios.get(cleanUrl, {
        timeout: CONFIG.HTTP_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 3
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extraire les emails
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const textEmails = html.match(emailRegex) || [];

      textEmails.forEach(email => {
        const cleanEmail = email.toLowerCase().trim();
        if (this.isValidEmail(cleanEmail)) {
          result.emails.push(cleanEmail);
        }
      });

      // Extraire les mailto:
      $('a[href^="mailto:"]').each((i, elem) => {
        const mailto = $(elem).attr('href');
        const email = mailto.replace('mailto:', '').split('?')[0].toLowerCase().trim();
        if (this.isValidEmail(email) && !result.emails.includes(email)) {
          result.emails.push(email);
        }
      });

      // Extraire les téléphones français
      const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
      const phones = html.match(phoneRegex) || [];

      phones.forEach(phone => {
        const cleanPhone = phone.replace(/[\s.-]/g, '');
        if (cleanPhone.length >= 10 && !result.phones.includes(cleanPhone)) {
          result.phones.push(this.formatPhone(cleanPhone));
        }
      });

      // Chercher SIRET dans les mentions légales
      const siretRegex = /(?:SIRET|siret)[:\s]*(\d{3}\s*\d{3}\s*\d{3}\s*\d{5}|\d{14})/gi;
      const siretMatch = html.match(siretRegex);
      if (siretMatch && siretMatch[0]) {
        result.siret = siretMatch[0].replace(/[^0-9]/g, '');
      }

      // Dédupliquer
      result.emails = [...new Set(result.emails)].slice(0, 5);
      result.phones = [...new Set(result.phones)].slice(0, 3);

    } catch (err) {
      // Ignorer les erreurs de scraping (timeout, 403, etc.)
    }

    return result;
  }

  /**
   * Trouver le site web d'une entreprise
   */
  async findWebsite(companyName, city) {
    // Pour l'instant, retourner null
    // TODO: Implémenter avec Google Custom Search ou DuckDuckGo
    return null;
  }

  /**
   * Valider un email (version basique)
   */
  isValidEmail(email) {
    if (!email || email.length < 5) return false;
    if (!email.includes('@')) return false;

    // Vérifier les patterns à ignorer
    for (const pattern of CONFIG.IGNORE_EMAIL_PATTERNS) {
      if (email.includes(pattern)) return false;
    }

    // Vérifier format basique
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validation email avancée avec score de confiance
   * @param {string} email - Email à valider
   * @returns {Object} { valid, score, reason, isDisposable, isGeneric, hasMx }
   */
  async validateEmailAdvanced(email) {
    const result = {
      valid: false,
      score: 0,
      reason: '',
      isDisposable: false,
      isGeneric: false,
      hasMx: false,
      domain: null
    };

    if (!email || email.length < 5) {
      result.reason = 'Email vide ou trop court';
      return result;
    }

    email = email.toLowerCase().trim();

    // Vérifier format basique
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      result.reason = 'Format email invalide';
      return result;
    }

    // Extraire le domaine
    const domain = email.split('@')[1];
    result.domain = domain;

    // Vérifier les patterns à ignorer
    for (const pattern of CONFIG.IGNORE_EMAIL_PATTERNS) {
      if (email.includes(pattern)) {
        result.reason = `Domaine ignoré: ${pattern}`;
        return result;
      }
    }

    // Vérifier si email jetable (disposable)
    if (CONFIG.DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      result.isDisposable = true;
      result.reason = 'Email jetable (disposable)';
      return result;
    }

    // Vérifier si domaine générique (gmail, yahoo, etc.)
    if (CONFIG.GENERIC_EMAIL_DOMAINS.includes(domain)) {
      result.isGeneric = true;
      result.score = 50; // Score réduit pour emails génériques
    }

    // Vérifier l'existence du domaine via MX records
    try {
      const mxRecords = await resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        result.hasMx = true;
        result.score += 30; // Bonus pour MX valide
      }
    } catch (err) {
      // Pas de MX records = domaine probablement invalide
      result.reason = 'Domaine sans enregistrement MX';
      result.score = 10;
    }

    // Email professionnel (domaine d'entreprise)
    if (!result.isGeneric && result.hasMx) {
      result.score = 90; // Score élevé pour email professionnel
    }

    result.valid = result.score >= 30;
    if (!result.reason) {
      result.reason = result.valid ? 'Email valide' : 'Score de confiance insuffisant';
    }

    return result;
  }

  /**
   * Vérifier si une entreprise est toujours active via Sirene
   * @param {string} siret - Numéro SIRET de l'entreprise
   * @returns {Object} { active, lastUpdate, closureDate, reason }
   */
  async verifyBusinessStatus(siret) {
    const result = {
      active: null,
      lastUpdate: null,
      closureDate: null,
      reason: '',
      companyData: null
    };

    if (!siret || siret.length !== 14) {
      result.reason = 'SIRET invalide';
      return result;
    }

    try {
      // Utiliser l'API Sirene pour vérifier le statut
      const response = await axios.get(`${CONFIG.SIRENE_API_URL}`, {
        params: {
          q: siret,
          per_page: 1
        },
        timeout: CONFIG.HTTP_TIMEOUT
      });

      if (!response.data?.results || response.data.results.length === 0) {
        result.reason = 'Entreprise non trouvée dans Sirene';
        result.active = false;
        return result;
      }

      const company = response.data.results[0];
      const siege = company.siege || {};

      // Vérifier l'état administratif
      // A = Actif, F = Fermé
      result.active = company.etat_administratif === 'A';
      result.lastUpdate = company.date_mise_a_jour || null;

      if (!result.active) {
        result.closureDate = company.date_fermeture || siege.date_fermeture || null;
        result.reason = 'Entreprise fermée';
      } else {
        result.reason = 'Entreprise active';
      }

      // Données complémentaires
      result.companyData = {
        nom: company.nom_complet,
        siret: siege.siret,
        siren: company.siren,
        activite: company.libelle_activite_principale,
        effectif: company.tranche_effectif_salarie,
        dateCreation: company.date_creation
      };

      return result;

    } catch (err) {
      if (err.response?.status === 429) {
        result.reason = 'Rate limit API Sirene';
      } else {
        result.reason = `Erreur vérification: ${err.message}`;
      }
      return result;
    }
  }

  /**
   * Validation complète d'un lead (email + statut entreprise)
   * @param {Object} lead - Le lead à valider
   * @returns {Object} Résultat de validation avec scores
   */
  async validateLeadQuality(lead) {
    const validation = {
      isValid: true,
      emailValidation: null,
      businessValidation: null,
      qualityScore: 0,
      issues: [],
      recommendations: []
    };

    // 1. Valider l'email si présent
    if (lead.email) {
      validation.emailValidation = await this.validateEmailAdvanced(lead.email);

      if (validation.emailValidation.isDisposable) {
        validation.issues.push('Email jetable détecté');
        validation.recommendations.push('Trouver un email professionnel');
      }

      if (validation.emailValidation.isGeneric) {
        validation.issues.push('Email générique (gmail, yahoo...)');
        validation.recommendations.push('Privilégier un email @domaine-entreprise');
      }

      if (!validation.emailValidation.hasMx) {
        validation.issues.push('Domaine email sans serveur MX');
        validation.recommendations.push('Vérifier l\'existence du domaine');
      }
    } else {
      validation.issues.push('Pas d\'email');
      validation.recommendations.push('Enrichir avec email via site web');
    }

    // 2. Vérifier le statut de l'entreprise si SIRET présent
    if (lead.siret) {
      validation.businessValidation = await this.verifyBusinessStatus(lead.siret);

      if (validation.businessValidation.active === false) {
        validation.isValid = false;
        validation.issues.push('Entreprise fermée');
        validation.recommendations.push('Exclure ce lead de la prospection');
      }
    } else {
      validation.issues.push('Pas de SIRET');
      validation.recommendations.push('Enrichir avec données Sirene');
    }

    // 3. Calculer le score de qualité global
    validation.qualityScore = this.calculateEnhancedQualityScore(lead, validation);

    // 4. Déterminer si le lead est valide
    validation.isValid = validation.isValid && validation.qualityScore >= CONFIG.MIN_QUALITY_SCORE;

    return validation;
  }

  /**
   * Score de qualité amélioré avec validation
   */
  calculateEnhancedQualityScore(lead, validation = null) {
    let score = 0;

    // === DONNÉES DE BASE (max 25 points) ===
    if (lead.company_name) score += 8;
    if (lead.city) score += 5;
    if (lead.address) score += 4;
    if (lead.postal_code) score += 4;
    if (lead.sector || lead.industry) score += 4;

    // === DONNÉES LÉGALES (max 25 points) ===
    if (lead.siret) score += 12;
    if (lead.siren) score += 5;
    if (lead.naf_code) score += 4;
    if (lead.creation_date) score += 4;

    // === CONTACT (max 30 points) ===
    if (lead.email) {
      if (validation?.emailValidation) {
        // Utiliser le score de validation email
        const emailScore = validation.emailValidation.score / 100 * 15;
        score += Math.round(emailScore);

        // Pénalités
        if (validation.emailValidation.isDisposable) score -= 10;
        if (validation.emailValidation.isGeneric) score -= 3;
      } else if (!lead.email_generated) {
        score += 12; // Email réel trouvé
      } else {
        score += 5; // Email généré (contact@domain)
      }
    }
    if (lead.phone) score += 10;
    if (lead.website) score += 5;

    // === ENRICHISSEMENT (max 20 points) ===
    if (lead.contact_name) score += 6;
    if (lead.contact_role) score += 4;
    if (lead.employee_count) score += 4;
    if (lead.rating && lead.rating >= 4) score += 3;
    if (lead.review_count && lead.review_count > 10) score += 3;

    // === PÉNALITÉS ===
    // Entreprise fermée = score 0
    if (validation?.businessValidation?.active === false) {
      return 0;
    }

    // Données trop anciennes
    if (lead.last_verified_at) {
      const daysSinceVerification = (Date.now() - new Date(lead.last_verified_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceVerification > 180) score -= 10;
      else if (daysSinceVerification > 90) score -= 5;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Formater un numéro de téléphone français
   */
  formatPhone(phone) {
    let clean = phone.replace(/[^0-9+]/g, '');

    // Convertir +33 en 0
    if (clean.startsWith('+33')) {
      clean = '0' + clean.substring(3);
    } else if (clean.startsWith('0033')) {
      clean = '0' + clean.substring(4);
    }

    // Formater XX XX XX XX XX
    if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }

    return phone;
  }

  /**
   * Extraire le domaine d'une URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  /**
   * Calculer le score de qualité d'un lead
   */
  calculateQualityScore(lead) {
    let score = 0;

    // Données de base (max 30 points)
    if (lead.company_name) score += 10;
    if (lead.city) score += 5;
    if (lead.address) score += 5;
    if (lead.postal_code) score += 5;
    if (lead.sector || lead.industry) score += 5;

    // Données légales (max 25 points)
    if (lead.siret) score += 15;
    if (lead.siren) score += 5;
    if (lead.naf_code) score += 5;

    // Contact (max 30 points)
    if (lead.email && !lead.email_generated) score += 15;
    else if (lead.email) score += 8;
    if (lead.phone) score += 10;
    if (lead.website) score += 5;

    // Enrichissement (max 15 points)
    if (lead.contact_name) score += 5;
    if (lead.employee_count) score += 5;
    if (lead.rating) score += 3;
    if (lead.creation_date) score += 2;

    return Math.min(score, 100);
  }

  /**
   * Mettre à jour le cache global avec les données enrichies
   */
  async updateGlobalCacheWithEnrichment(lead) {
    if (!lead.id && !lead.siret && !(lead.company_name && lead.city)) return;

    try {
      await execute(`
        UPDATE global_leads SET
          email = COALESCE($1, email),
          phone = COALESCE($2, phone),
          website = COALESCE($3, website),
          all_emails = COALESCE($4, all_emails),
          last_verified_at = NOW()
        WHERE id = $5
           OR siret = $6
           OR (LOWER(company_name) = LOWER($7) AND LOWER(city) = LOWER($8))
      `, [
        lead.email, lead.phone, lead.website, lead.all_emails,
        lead.id, lead.siret, lead.company_name, lead.city
      ]);
    } catch (err) {
      // Ignorer les erreurs
    }
  }

  /**
   * Petit délai
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return { ...this.stats };
  }
}

export default LeadEnrichmentService;
export { LeadEnrichmentService, CONFIG, SECTOR_TO_NAF };
