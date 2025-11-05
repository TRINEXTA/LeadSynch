import { generateEmailTemplate, improveEmailTemplate } from '../lib/aiTemplateGenerator.js';

// Générer un template avec IA
export const generateTemplate = async (req, res) => {
  try {
    const params = req.body;

    if (!params.email_type || !params.objective) {
      return res.status(400).json({ 
        message: 'Type d\'email et objectif requis' 
      });
    }

    console.log('🤖 Demande de génération IA:', params);

    const result = await generateEmailTemplate(params);

    res.json({
      success: true,
      template: result
    });
  } catch (error) {
    console.error('❌ Erreur génération:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération',
      error: error.message 
    });
  }
};

// Améliorer un template existant
export const improveTemplate = async (req, res) => {
  try {
    const { html, improvement_request } = req.body;

    if (!html || !improvement_request) {
      return res.status(400).json({ 
        message: 'Template HTML et demande d\'amélioration requis' 
      });
    }

    const result = await improveEmailTemplate(html, improvement_request);

    res.json({
      success: true,
      improved: result
    });
  } catch (error) {
    console.error('❌ Erreur amélioration:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'amélioration',
      error: error.message 
    });
  }
};
