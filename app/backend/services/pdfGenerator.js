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
    console.error('❌ Erreur génération PDF:', error);
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
    console.error('❌ Erreur sauvegarde PDF:', error);
    throw error;
  }
}