import DOMPurify from 'isomorphic-dompurify';

/**
 * ✅ SÉCURITÉ: Sanitize HTML pour prévenir XSS
 * Utilise DOMPurify pour nettoyer le HTML malveillant
 *
 * @param {string} html - HTML brut potentiellement dangereux
 * @param {object} options - Options DOMPurify personnalisées
 * @returns {string} - HTML sécurisé
 */
export function sanitizeHTML(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const defaultOptions = {
    ALLOWED_TAGS: [
      // Structure
      'div', 'span', 'p', 'br', 'hr',
      // Texte
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 'strike', 'b', 'i',
      // Listes
      'ul', 'ol', 'li',
      // Tableaux
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      // Liens et images (email templates)
      'a', 'img',
      // Email styling
      'center', 'font'
    ],
    ALLOWED_ATTR: [
      // Styling
      'style', 'class', 'id',
      // Liens
      'href', 'target', 'rel',
      // Images
      'src', 'alt', 'width', 'height',
      // Tableaux
      'colspan', 'rowspan', 'align', 'valign',
      // Email
      'bgcolor', 'color', 'size'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true, // Garder le contenu texte si tag supprimé
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    ...options
  };

  try {
    const clean = DOMPurify.sanitize(html, defaultOptions);
    return clean;
  } catch (error) {
    console.error('❌ Erreur sanitization HTML:', error);
    // En cas d'erreur, retourner une version ultra-sécurisée (texte uniquement)
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
  }
}

/**
 * ✅ SÉCURITÉ: Sanitization stricte pour UGC (User Generated Content)
 * Enlève TOUT le HTML, garde uniquement le texte
 *
 * @param {string} text - Texte potentiellement dangereux
 * @returns {string} - Texte pur sans HTML
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  });
}

/**
 * ✅ SÉCURITÉ: Validation d'URL pour éviter javascript: et data:
 *
 * @param {string} url - URL à valider
 * @returns {boolean} - true si URL sûre
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Bloquer javascript:, data:, vbscript:, etc.
  const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i;
  if (dangerousProtocols.test(url.trim())) {
    return false;
  }

  // Autoriser http(s), mailto, tel
  const safeProtocols = /^(https?|mailto|tel):/i;
  return safeProtocols.test(url.trim()) || url.startsWith('/') || url.startsWith('#');
}
