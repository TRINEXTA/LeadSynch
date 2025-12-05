import { log, error, warn } from "../lib/logger.js";
﻿/**
 * Module pour ajouter automatiquement le footer de désabonnement
 * et les informations légales (RGPD/CAN-SPAM) à tous les emails
 */

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Ajouter le footer de désabonnement à un email HTML
 * @param {string} htmlContent - Contenu HTML de l'email
 * @param {string} leadId - ID du lead
 * @param {object} companyInfo - Infos entreprise (nom, adresse)
 * @returns {string} - HTML avec footer ajouté
 */
export function addUnsubscribeFooter(htmlContent, leadId, companyInfo = {}) {
  const {
    company_name = 'LeadSynch',
    company_address = '123 Rue Example, 75001 Paris, France'
  } = companyInfo;

  const unsubscribeUrl = `${BASE_URL}/unsubscribe/${leadId}`;

  const footer = `
    <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
          <td style="text-align: center; padding: 20px;">
            <!-- Informations légales -->
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
              <strong>${company_name}</strong><br>
              ${company_address}
            </p>

            <!-- Lien de désabonnement -->
            <p style="margin: 20px 0 10px 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
              Vous recevez cet email car vous êtes inscrit dans notre base de contacts.<br>
              Si vous ne souhaitez plus recevoir nos communications :
            </p>

            <a href="${unsubscribeUrl}" 
               style="display: inline-block; margin: 10px 0; padding: 10px 20px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
              Se désabonner
            </a>

            <!-- Note légale -->
            <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
              Conformément au RGPD et à la loi CAN-SPAM, vous avez le droit de vous désabonner à tout moment.<br>
              Vos données sont traitées de manière confidentielle et ne sont jamais partagées avec des tiers.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  // Ajouter le footer avant la balise </body> si elle existe
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footer}</body>`);
  }

  // Sinon, ajouter à la fin
  return htmlContent + footer;
}

/**
 * Ajouter le footer de désabonnement à un email texte brut
 * @param {string} textContent - Contenu texte de l'email
 * @param {string} leadId - ID du lead
 * @param {object} companyInfo - Infos entreprise
 * @returns {string} - Texte avec footer ajouté
 */
export function addUnsubscribeFooterText(textContent, leadId, companyInfo = {}) {
  const {
    company_name = 'LeadSynch',
    company_address = '123 Rue Example, 75001 Paris, France'
  } = companyInfo;

  const unsubscribeUrl = `${BASE_URL}/unsubscribe/${leadId}`;

  const footer = `

---
${company_name}
${company_address}

Vous recevez cet email car vous êtes inscrit dans notre base de contacts.
Pour vous désabonner : ${unsubscribeUrl}

Conformément au RGPD, vos données sont traitées de manière confidentielle.
`;

  return textContent + footer;
}

/**
 * Vérifier si un email contient déjà un lien de désabonnement
 * @param {string} content - Contenu de l'email
 * @returns {boolean}
 */
export function hasUnsubscribeLink(content) {
  return content.includes('/unsubscribe/') || 
         content.toLowerCase().includes('se désabonner') ||
         content.toLowerCase().includes('unsubscribe');
}

export default {
  addUnsubscribeFooter,
  addUnsubscribeFooterText,
  hasUnsubscribeLink
};
