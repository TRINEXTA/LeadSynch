import { log, error, warn } from "../lib/logger.js";
﻿import { analyzeEmail } from '../lib/spamAnalyzer.js';

// Analyser un email
export const analyzeSpam = async (req, res) => {
  try {
    const { subject, content, from_email, from_name } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ message: 'Sujet et contenu requis' });
    }

    const analysis = analyzeEmail({
      subject,
      content,
      from_email,
      from_name
    });

    res.json(analysis);
  } catch (error) {
    error('Erreur analyse spam:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Analyser un template existant
export const analyzeTemplate = async (req, res) => {
  try {
    const { template_id } = req.params;

    // TODO: Récupérer le template depuis la DB
    // const template = await db.queryOne('SELECT * FROM email_templates WHERE id = $1', [template_id]);

    res.json({ message: 'À implémenter' });
  } catch (error) {
    error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
