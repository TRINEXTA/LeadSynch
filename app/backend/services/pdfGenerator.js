import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';

// Colors
const COLORS = {
  primary: '#4F46E5',
  secondary: '#6366F1',
  text: '#333333',
  textLight: '#666666',
  border: '#E5E7EB',
  background: '#F9FAFB'
};

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

// Generate Proposal/Quote PDF
export async function generateProposalPDF(proposal, lead, tenant) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor(COLORS.primary).text(tenant?.name || 'TRINEXTA', 50, 50);
      doc.fontSize(10).fillColor(COLORS.textLight);
      doc.text(tenant?.address || '', 50, 80);
      doc.text(`${tenant?.postal_code || ''} ${tenant?.city || ''}`, 50, 95);
      doc.text(`SIRET: ${tenant?.siret || 'N/A'}`, 50, 110);

      // Document Title
      doc.fontSize(20).fillColor(COLORS.primary).text('DEVIS', 400, 50, { align: 'right' });
      doc.fontSize(12).fillColor(COLORS.text);
      doc.text(`Référence: ${proposal.reference || 'N/A'}`, 400, 80, { align: 'right' });
      doc.text(`Date: ${new Date(proposal.created_at || Date.now()).toLocaleDateString('fr-FR')}`, 400, 100, { align: 'right' });
      if (proposal.valid_until) {
        doc.text(`Valable jusqu'au: ${new Date(proposal.valid_until).toLocaleDateString('fr-FR')}`, 400, 120, { align: 'right' });
      }

      // Line separator
      doc.moveTo(50, 150).lineTo(545, 150).strokeColor(COLORS.primary).lineWidth(2).stroke();

      // Client info
      doc.fontSize(12).fillColor(COLORS.primary).text('CLIENT', 50, 170);
      doc.fontSize(11).fillColor(COLORS.text);
      doc.text(lead?.company_name || 'Client', 50, 190);
      if (lead?.contact_name) doc.text(`À l'attention de: ${lead.contact_name}`, 50, 205);
      if (lead?.address) doc.text(lead.address, 50, 220);
      if (lead?.postal_code || lead?.city) doc.text(`${lead?.postal_code || ''} ${lead?.city || ''}`, 50, 235);
      if (lead?.email) doc.text(`Email: ${lead.email}`, 50, 250);

      // Services table
      let yPos = 290;
      doc.fontSize(12).fillColor(COLORS.primary).text('PRESTATIONS', 50, yPos);
      yPos += 25;

      // Table header
      doc.rect(50, yPos, 495, 25).fill(COLORS.primary);
      doc.fontSize(10).fillColor('white');
      doc.text('Description', 55, yPos + 7);
      doc.text('Qté', 350, yPos + 7, { width: 50, align: 'center' });
      doc.text('Prix unit. HT', 400, yPos + 7, { width: 70, align: 'right' });
      doc.text('Total HT', 475, yPos + 7, { width: 65, align: 'right' });
      yPos += 25;

      // Table rows
      const services = proposal.services || [];
      doc.fillColor(COLORS.text).fontSize(10);

      services.forEach((service, index) => {
        const bgColor = index % 2 === 0 ? 'white' : COLORS.background;
        doc.rect(50, yPos, 495, 25).fill(bgColor);
        doc.fillColor(COLORS.text);
        doc.text(service.name || service.description || 'Service', 55, yPos + 7, { width: 290 });
        doc.text(String(service.quantity || 1), 350, yPos + 7, { width: 50, align: 'center' });
        doc.text(`${(service.unit_price || 0).toFixed(2)} €`, 400, yPos + 7, { width: 70, align: 'right' });
        doc.text(`${((service.quantity || 1) * (service.unit_price || 0)).toFixed(2)} €`, 475, yPos + 7, { width: 65, align: 'right' });
        yPos += 25;
      });

      // Totals
      yPos += 20;
      const totalHT = proposal.total_ht || services.reduce((sum, s) => sum + (s.quantity || 1) * (s.unit_price || 0), 0);
      const tva = proposal.total_tva || totalHT * 0.20;
      const totalTTC = proposal.total_ttc || totalHT + tva;

      doc.fontSize(11);
      doc.text('Total HT:', 380, yPos).text(`${totalHT.toFixed(2)} €`, 475, yPos, { width: 65, align: 'right' });
      yPos += 18;
      doc.text('TVA (20%):', 380, yPos).text(`${tva.toFixed(2)} €`, 475, yPos, { width: 65, align: 'right' });
      yPos += 18;
      doc.fontSize(13).fillColor(COLORS.primary).font('Helvetica-Bold');
      doc.text('Total TTC:', 380, yPos).text(`${totalTTC.toFixed(2)} €`, 475, yPos, { width: 65, align: 'right' });

      // Notes
      if (proposal.notes) {
        yPos += 40;
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight);
        doc.text('Notes:', 50, yPos);
        doc.text(proposal.notes, 50, yPos + 15, { width: 495 });
      }

      // Footer
      doc.fontSize(9).fillColor(COLORS.textLight);
      doc.text('Ce devis est valable 30 jours à compter de sa date d\'émission.', 50, 750, { align: 'center', width: 495 });
      doc.text(`${tenant?.name || 'TRINEXTA'} - SIRET: ${tenant?.siret || 'N/A'}`, 50, 765, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate Contract PDF
export async function generateContractPDF(contract, lead, tenant) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor(COLORS.primary).text(tenant?.name || 'TRINEXTA', 50, 50);
      doc.fontSize(10).fillColor(COLORS.textLight);
      doc.text(tenant?.address || '', 50, 80);
      doc.text(`${tenant?.postal_code || ''} ${tenant?.city || ''}`, 50, 95);
      doc.text(`SIRET: ${tenant?.siret || 'N/A'}`, 50, 110);

      // Document Title
      doc.fontSize(20).fillColor('#EA580C').text('CONTRAT', 400, 50, { align: 'right' });
      doc.fontSize(12).fillColor(COLORS.text);
      doc.text(`Référence: ${contract.reference || 'N/A'}`, 400, 80, { align: 'right' });
      doc.text(`Date: ${new Date(contract.created_at || Date.now()).toLocaleDateString('fr-FR')}`, 400, 100, { align: 'right' });

      // Line separator
      doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#EA580C').lineWidth(2).stroke();

      // Client info
      doc.fontSize(12).fillColor('#EA580C').text('CLIENT', 50, 160);
      doc.fontSize(11).fillColor(COLORS.text);
      doc.text(lead?.company_name || contract.company_name || 'Client', 50, 180);
      if (lead?.contact_name) doc.text(`À l'attention de: ${lead.contact_name}`, 50, 195);
      if (lead?.address) doc.text(lead.address, 50, 210);
      if (lead?.postal_code || lead?.city) doc.text(`${lead?.postal_code || ''} ${lead?.city || ''}`, 50, 225);
      if (lead?.email) doc.text(`Email: ${lead.email}`, 50, 240);

      // Contract details
      let yPos = 280;
      doc.fontSize(12).fillColor('#EA580C').text('DÉTAILS DU CONTRAT', 50, yPos);
      yPos += 25;

      doc.fontSize(11).fillColor(COLORS.text);
      doc.text(`Offre: ${contract.offer_name || 'N/A'}`, 50, yPos);
      yPos += 18;
      doc.text(`Type: ${contract.contract_type === 'avec_engagement_12' ? 'Avec engagement 12 mois' : 'Sans engagement'}`, 50, yPos);
      yPos += 18;
      doc.text(`Date de début: ${new Date(contract.start_date || Date.now()).toLocaleDateString('fr-FR')}`, 50, yPos);
      yPos += 18;
      doc.text(`Paiement: ${contract.payment_frequency === 'annuel' ? 'Annuel' : 'Mensuel'}`, 50, yPos);

      // Services
      yPos += 35;
      doc.fontSize(12).fillColor('#EA580C').text('SERVICES INCLUS', 50, yPos);
      yPos += 20;

      const services = contract.services || [];
      doc.fontSize(10).fillColor(COLORS.text);
      services.forEach(service => {
        doc.text(`• ${service}`, 60, yPos, { width: 480 });
        yPos += 15;
      });

      // Pricing
      yPos += 25;
      doc.rect(50, yPos, 495, 60).fill(COLORS.background).stroke(COLORS.border);
      doc.fontSize(14).fillColor('#EA580C').font('Helvetica-Bold');
      doc.text('TARIFICATION', 60, yPos + 10);
      doc.fontSize(12).fillColor(COLORS.text);
      doc.text(`Mensuel HT: ${(contract.monthly_price || 0).toFixed(2)} €`, 60, yPos + 30);
      doc.text(`Total annuel HT: ${((contract.monthly_price || 0) * 12).toFixed(2)} €`, 300, yPos + 30);

      // Signatures
      yPos += 100;
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight);
      doc.text('Signature du prestataire:', 50, yPos);
      doc.text('Signature du client:', 300, yPos);

      // Signature boxes
      doc.rect(50, yPos + 15, 200, 60).stroke(COLORS.border);
      doc.rect(300, yPos + 15, 200, 60).stroke(COLORS.border);

      doc.text('Date:', 50, yPos + 85);
      doc.text('Date:', 300, yPos + 85);

      // Footer
      doc.fontSize(9).fillColor(COLORS.textLight);
      doc.text(`${tenant?.name || 'TRINEXTA'} - SIRET: ${tenant?.siret || 'N/A'}`, 50, 750, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default { generateProposalPDF, generateContractPDF, savePDF };
