import { log, error, warn } from "../lib/logger.js";
﻿/**
 * Analyseur Anti-Spam - Score de délivrabilité email
 * Objectif : Garantir 90% de délivrabilité
 */

// Mots déclencheurs de spam (weights = pénalité)
const SPAM_WORDS = {
  // Urgence/Pression
  'urgent': 10,
  'act now': 15,
  'limited time': 10,
  'hurry': 8,
  'expires today': 12,
  'last chance': 10,
  
  // Argent
  'free': 15,
  'gratuit': 15,
  '100% free': 20,
  'no cost': 10,
  'earn money': 15,
  'make money': 15,
  'cash': 12,
  '€€€': 15,
  '$$$': 15,
  
  // Clickbait
  'click here': 12,
  'cliquez ici': 12,
  'subscribe': 8,
  'winner': 15,
  'congratulations': 12,
  'félicitations': 12,
  
  // Promesses exagérées
  'guarantee': 10,
  'guaranteed': 10,
  'garanti': 10,
  'risk free': 12,
  'no risk': 10,
  '100%': 8,
  'miracle': 15,
  
  // Marketing agressif
  'buy now': 12,
  'order now': 12,
  'achetez maintenant': 12,
  'discount': 8,
  'promo': 5,
  'offer': 5
};

// Patterns suspects (regex)
const SPAM_PATTERNS = [
  { pattern: /!{3,}/g, weight: 10, name: 'Multiples points d\'exclamation' },
  { pattern: /\${2,}/g, weight: 12, name: 'Symboles monétaires répétés' },
  { pattern: /[A-Z]{10,}/g, weight: 15, name: 'TEXTE EN MAJUSCULES' },
  { pattern: /\b\d+%\b/g, weight: 5, name: 'Pourcentages multiples' },
  { pattern: /<script/gi, weight: 50, name: 'Code JavaScript (DANGEREUX)' },
  { pattern: /onclick|onerror|onload/gi, weight: 30, name: 'Événements JavaScript' }
];

/**
 * Analyser le contenu d'un email
 * @param {object} email - {subject, content, from_email, from_name}
 * @returns {object} - {score, issues, recommendations}
 */
export function analyzeEmail(email) {
  const { subject = '', content = '', from_email = '', from_name = '' } = email;
  
  let totalPenalty = 0;
  const issues = [];
  const recommendations = [];
  
  const fullText = `${subject} ${content} ${from_name}`.toLowerCase();

  // 1. Analyser les mots spam
  for (const [word, weight] of Object.entries(SPAM_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = fullText.match(regex);
    if (matches) {
      totalPenalty += weight * matches.length;
      issues.push({
        type: 'spam_word',
        severity: weight > 10 ? 'high' : 'medium',
        message: `Mot suspect: "${word}" (${matches.length}x)`,
        weight
      });
    }
  }

  // 2. Analyser les patterns
  for (const { pattern, weight, name } of SPAM_PATTERNS) {
    const matches = (subject + content).match(pattern);
    if (matches) {
      totalPenalty += weight;
      issues.push({
        type: 'pattern',
        severity: weight > 20 ? 'high' : 'medium',
        message: `${name} détecté`,
        weight
      });
    }
  }

  // 3. Vérifier la longueur du sujet
  if (subject.length < 10) {
    totalPenalty += 5;
    issues.push({
      type: 'subject',
      severity: 'low',
      message: 'Sujet trop court (< 10 caractères)',
      weight: 5
    });
  }
  if (subject.length > 70) {
    totalPenalty += 8;
    issues.push({
      type: 'subject',
      severity: 'medium',
      message: 'Sujet trop long (> 70 caractères)',
      weight: 8
    });
  }

  // 4. Vérifier l'email expéditeur
  if (!from_email || !from_email.includes('@')) {
    totalPenalty += 20;
    issues.push({
      type: 'sender',
      severity: 'high',
      message: 'Email expéditeur invalide',
      weight: 20
    });
  }

  // 5. Ratio texte/liens
  const linkCount = (content.match(/<a /gi) || []).length;
  const textLength = content.replace(/<[^>]*>/g, '').length;
  if (linkCount > 5 && textLength < 500) {
    totalPenalty += 10;
    issues.push({
      type: 'links',
      severity: 'medium',
      message: 'Trop de liens par rapport au texte',
      weight: 10
    });
  }

  // 6. Vérifier images manquantes de texte alt
  const imgWithoutAlt = (content.match(/<img(?![^>]*alt=)/gi) || []).length;
  if (imgWithoutAlt > 0) {
    totalPenalty += 5;
    issues.push({
      type: 'accessibility',
      severity: 'low',
      message: `${imgWithoutAlt} image(s) sans attribut "alt"`,
      weight: 5
    });
  }

  // Calculer le score (0-100, 100 = parfait)
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  // Générer les recommandations
  if (score < 50) {
    recommendations.push('⚠️ Score critique ! Votre email risque d\'être bloqué.');
    recommendations.push('🔧 Retirez les mots suspects et réduisez les majuscules.');
  } else if (score < 70) {
    recommendations.push('⚠️ Score moyen. Améliorations recommandées.');
    recommendations.push('✅ Réduisez l\'utilisation de mots marketing agressifs.');
  } else if (score < 90) {
    recommendations.push('✅ Bon score ! Quelques améliorations mineures possibles.');
  } else {
    recommendations.push('🎉 Excellent ! Très bonne délivrabilité attendue.');
  }

  // Recommandations générales
  if (issues.length > 0) {
    recommendations.push('');
    recommendations.push('📋 Recommandations :');
    if (issues.some(i => i.type === 'spam_word')) {
      recommendations.push('• Remplacez les mots suspects par des synonymes neutres');
    }
    if (issues.some(i => i.type === 'pattern')) {
      recommendations.push('• Évitez les majuscules excessives et les points d\'exclamation');
    }
    if (issues.some(i => i.type === 'subject')) {
      recommendations.push('• Optimisez la longueur du sujet (30-50 caractères idéal)');
    }
    if (issues.some(i => i.type === 'links')) {
      recommendations.push('• Ajoutez plus de contenu texte entre les liens');
    }
  }

  // Ajouter checklist technique
  recommendations.push('');
  recommendations.push('🔐 Checklist technique :');
  recommendations.push('☐ Configurez SPF pour votre domaine');
  recommendations.push('☐ Configurez DKIM pour signer vos emails');
  recommendations.push('☐ Configurez DMARC pour la réputation');
  recommendations.push('☐ Utilisez un domaine authentifié (pas @gmail.com)');
  recommendations.push('☐ Ajoutez un lien de désabonnement visible');

  return {
    score: Math.round(score),
    deliverability: score >= 90 ? 'Excellent (90%+)' : 
                    score >= 70 ? 'Bon (70-90%)' : 
                    score >= 50 ? 'Moyen (50-70%)' : 
                    'Faible (< 50%)',
    issues: issues.sort((a, b) => b.weight - a.weight),
    recommendations,
    totalPenalty
  };
}

export default { analyzeEmail };
