import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export async function generatePDFFromHTML(htmlContent, options = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Erreur generation PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function savePDF(pdfBuffer, filename) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, pdfBuffer);

    return `/uploads/contracts/${filename}`;
  } catch (error) {
    console.error('Erreur sauvegarde PDF:', error);
    throw error;
  }
}

// Template HTML pour les devis
const getProposalTemplate = (proposal, lead, tenant) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #4F46E5; }
    .logo span { color: #333; }
    .company-info { text-align: right; font-size: 12px; color: #666; }
    .document-title { text-align: center; margin: 30px 0; }
    .document-title h1 { font-size: 24px; color: #4F46E5; margin-bottom: 5px; }
    .document-title .reference { font-size: 14px; color: #666; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 14px; font-weight: bold; color: #4F46E5; margin-bottom: 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
    .client-info { background: #f8f9fa; padding: 15px; border-radius: 8px; }
    .client-info p { margin: 5px 0; }
    .services-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .services-table th { background: #4F46E5; color: white; padding: 12px; text-align: left; font-size: 12px; }
    .services-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
    .services-table tr:nth-child(even) { background: #f8f9fa; }
    .totals { margin-top: 20px; text-align: right; }
    .totals-table { display: inline-block; text-align: left; }
    .totals-table tr td { padding: 8px 20px; }
    .totals-table tr td:first-child { color: #666; }
    .totals-table tr td:last-child { font-weight: bold; }
    .totals-table .total-ttc { font-size: 18px; color: #4F46E5; background: #f0f0ff; }
    .validity { margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 8px; font-size: 13px; }
    .notes { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; }
    .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Lead<span>Synch</span></div>
      <p style="font-size: 12px; color: #666; margin-top: 5px;">${tenant?.name || 'Votre entreprise'}</p>
    </div>
    <div class="company-info">
      <p><strong>${tenant?.name || ''}</strong></p>
      <p>${tenant?.address || ''}</p>
      <p>${tenant?.postal_code || ''} ${tenant?.city || ''}</p>
      <p>SIRET: ${tenant?.siret || ''}</p>
      <p>Email: ${tenant?.email || ''}</p>
    </div>
  </div>
  <div class="document-title">
    <h1>DEVIS</h1>
    <p class="reference">Ref: ${proposal.reference} | Date: ${new Date(proposal.created_at).toLocaleDateString('fr-FR')}</p>
  </div>
  <div class="section">
    <div class="section-title">CLIENT</div>
    <div class="client-info">
      <p><strong>${lead?.company_name || 'Client'}</strong></p>
      <p>${lead?.contact_name || ''}</p>
      <p>${lead?.address || ''}</p>
      <p>${lead?.postal_code || ''} ${lead?.city || ''}</p>
      <p>Email: ${lead?.email || ''}</p>
      <p>Tel: ${lead?.phone || ''}</p>
    </div>
  </div>
  <div class="section">
    <div class="section-title">PRESTATIONS</div>
    <table class="services-table">
      <thead>
        <tr>
          <th style="width: 50%">Description</th>
          <th style="width: 15%">Quantite</th>
          <th style="width: 17%">Prix unitaire</th>
          <th style="width: 18%">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${(proposal.services || []).map(s => `
          <tr>
            <td>
              <strong>${s.name || 'Service'}</strong>
              ${s.description ? `<br><span style="color: #666; font-size: 11px;">${s.description}</span>` : ''}
            </td>
            <td>${s.quantity || 1}</td>
            <td>${(s.unit_price || 0).toFixed(2)} EUR</td>
            <td>${((s.quantity || 1) * (s.unit_price || 0)).toFixed(2)} EUR</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <div class="totals">
    <table class="totals-table">
      <tr><td>Total HT</td><td>${(proposal.total_ht || 0).toFixed(2)} EUR</td></tr>
      <tr><td>TVA (${proposal.tax_rate || 20}%)</td><td>${(proposal.total_tva || 0).toFixed(2)} EUR</td></tr>
      <tr class="total-ttc"><td>Total TTC</td><td>${(proposal.total_ttc || 0).toFixed(2)} EUR</td></tr>
    </table>
  </div>
  ${proposal.valid_until ? `<div class="validity"><strong>Validite:</strong> Ce devis est valable jusqu'au ${new Date(proposal.valid_until).toLocaleDateString('fr-FR')}.</div>` : ''}
  ${proposal.notes ? `<div class="notes"><strong>Notes:</strong><br>${proposal.notes}</div>` : ''}
  <div class="footer">
    <p>${tenant?.name || ''} - ${tenant?.address || ''} ${tenant?.postal_code || ''} ${tenant?.city || ''}</p>
    <p>SIRET: ${tenant?.siret || ''} | TVA: ${tenant?.tva_number || ''}</p>
  </div>
</body>
</html>
`;

// Template HTML pour les contrats
const getContractTemplate = (contract, lead, tenant) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
    .logo span { color: #333; }
    .company-info { text-align: right; font-size: 11px; color: #666; }
    .document-title { text-align: center; margin: 20px 0; }
    .document-title h1 { font-size: 22px; color: #4F46E5; margin-bottom: 5px; }
    .parties { display: flex; gap: 30px; margin-bottom: 25px; }
    .party { flex: 1; padding: 15px; border-radius: 8px; }
    .party.provider { background: #f0f0ff; }
    .party.client { background: #f8f9fa; }
    .party-title { font-weight: bold; color: #4F46E5; margin-bottom: 8px; font-size: 13px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: bold; color: #4F46E5; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
    .contract-details { background: #f8f9fa; padding: 15px; border-radius: 8px; }
    .contract-details table { width: 100%; }
    .contract-details td { padding: 5px 0; }
    .contract-details td:first-child { color: #666; width: 40%; }
    .services-list { padding-left: 20px; }
    .services-list li { margin: 5px 0; }
    .price-box { background: #4F46E5; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .price-box .amount { font-size: 28px; font-weight: bold; }
    .price-box .period { font-size: 12px; opacity: 0.9; }
    .terms { font-size: 11px; color: #666; margin-top: 20px; }
    .terms h4 { color: #333; margin-bottom: 10px; }
    .terms ol { padding-left: 20px; }
    .terms li { margin: 8px 0; }
    .signature-section { margin-top: 40px; display: flex; gap: 50px; }
    .signature-box { flex: 1; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; min-height: 120px; }
    .signature-box .label { font-size: 11px; color: #666; margin-bottom: 10px; }
    .signature-box .date { margin-top: 60px; font-size: 11px; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Lead<span>Synch</span></div>
      <p style="font-size: 11px; color: #666; margin-top: 5px;">${tenant?.name || ''}</p>
    </div>
    <div class="company-info">
      <p><strong>Ref: ${contract.reference || contract.id?.substring(0, 8)}</strong></p>
      <p>Date: ${new Date(contract.created_at).toLocaleDateString('fr-FR')}</p>
    </div>
  </div>
  <div class="document-title">
    <h1>CONTRAT DE PRESTATION DE SERVICES</h1>
    <p style="font-size: 12px; color: #666;">${contract.offer_name || 'Contrat'}</p>
  </div>
  <div class="parties">
    <div class="party provider">
      <div class="party-title">LE PRESTATAIRE</div>
      <p><strong>${tenant?.name || ''}</strong></p>
      <p>${tenant?.address || ''}</p>
      <p>${tenant?.postal_code || ''} ${tenant?.city || ''}</p>
      <p>SIRET: ${tenant?.siret || ''}</p>
    </div>
    <div class="party client">
      <div class="party-title">LE CLIENT</div>
      <p><strong>${lead?.company_name || ''}</strong></p>
      <p>${lead?.contact_name || ''}</p>
      <p>${lead?.address || ''}</p>
      <p>${lead?.postal_code || ''} ${lead?.city || ''}</p>
    </div>
  </div>
  <div class="section">
    <div class="section-title">OBJET DU CONTRAT</div>
    <div class="contract-details">
      <table>
        <tr><td>Offre</td><td><strong>${contract.offer_name || ''}</strong></td></tr>
        <tr><td>Type de contrat</td><td>${contract.contract_type === 'avec_engagement_12' ? 'Avec engagement 12 mois' : 'Sans engagement'}</td></tr>
        <tr><td>Frequence de paiement</td><td>${contract.payment_frequency === 'mensuel' ? 'Mensuel' : 'Annuel'}</td></tr>
        <tr><td>Nombre d\'utilisateurs</td><td>${contract.user_count || 1}</td></tr>
        <tr><td>Date de debut</td><td>${contract.start_date ? new Date(contract.start_date).toLocaleDateString('fr-FR') : '-'}</td></tr>
        ${contract.end_date ? `<tr><td>Date de fin</td><td>${new Date(contract.end_date).toLocaleDateString('fr-FR')}</td></tr>` : ''}
      </table>
    </div>
  </div>
  ${contract.services && contract.services.length > 0 ? `
  <div class="section">
    <div class="section-title">SERVICES INCLUS</div>
    <ul class="services-list">
      ${(typeof contract.services === 'string' ? JSON.parse(contract.services) : contract.services).map(s => `<li>${s}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  <div class="price-box">
    <div class="amount">${(contract.monthly_price || 0).toFixed(2)} EUR</div>
    <div class="period">par mois ${contract.payment_frequency === 'annuel' ? `(${(contract.total_amount || 0).toFixed(2)} EUR/an)` : ''}</div>
  </div>
  <div class="terms">
    <h4>CONDITIONS GENERALES</h4>
    <ol>
      <li><strong>Duree:</strong> ${contract.contract_type === 'avec_engagement_12' ? 'Le present contrat est conclu pour une duree de 12 mois.' : 'Le present contrat est conclu sans engagement de duree minimale.'}</li>
      <li><strong>Paiement:</strong> Le paiement s\'effectue ${contract.payment_frequency === 'mensuel' ? 'mensuellement' : 'annuellement'} par prelevement automatique.</li>
      <li><strong>Resiliation:</strong> ${contract.contract_type === 'avec_engagement_12' ? 'Toute resiliation anticipee entrainera le paiement des mensualites restantes.' : 'Le contrat peut etre resilie a tout moment avec un preavis de 30 jours.'}</li>
    </ol>
  </div>
  ${contract.notes ? `<div class="section" style="margin-top: 20px;"><div class="section-title">NOTES</div><p>${contract.notes}</p></div>` : ''}
  <div class="signature-section">
    <div class="signature-box">
      <div class="label">Le Prestataire<br><small>${tenant?.name || ''}</small></div>
      <div class="date">Date: ____/____/________</div>
    </div>
    <div class="signature-box">
      <div class="label">Le Client<br><small>${lead?.company_name || ''}</small></div>
      <div class="date">Date: ____/____/________</div>
    </div>
  </div>
  <div class="footer">
    <p>${tenant?.name || ''} - SIRET: ${tenant?.siret || ''}</p>
  </div>
</body>
</html>
`;

// Generer PDF de devis
export async function generateProposalPDF(proposal, lead, tenant) {
  const html = getProposalTemplate(proposal, lead, tenant);
  return generatePDFFromHTML(html);
}

// Generer PDF de contrat
export async function generateContractPDF(contract, lead, tenant) {
  const html = getContractTemplate(contract, lead, tenant);
  return generatePDFFromHTML(html);
}

export default {
  generatePDFFromHTML,
  savePDF,
  generateProposalPDF,
  generateContractPDF
};