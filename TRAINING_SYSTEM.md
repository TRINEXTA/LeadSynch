# 🎓 Système de Formation LeadSynch

## Vue d'ensemble

Système de formation **obligatoire au premier login** avec contenu adapté par rôle (commercial, manager, admin).

---

## 📁 Fichiers créés

### Backend

1. **`app/backend/lib/training-content.js`** - Contenu de formation
   - 3 parcours : Commercial (15 min), Manager (20 min), Admin (25 min)
   - Modules interactifs avec vidéos, quiz, checklistsplus, tutoriels
   - Function `getTrainingByRole(role)` pour récupérer le contenu
   - Function `isTrainingCompleted(progress, role)` pour vérifier complétion

2. **`app/backend/api/training.js`** - API endpoints
   - `GET /api/training` - Récupérer contenu + progression
   - `POST /api/training/start` - Démarrer formation
   - `POST /api/training/complete-module` - Marquer module complété
   - `POST /api/training/reset` - Réinitialiser (admin only)
   - `GET /api/training/stats` - Stats formation (admin/manager)

3. **`app/backend/migrations/create_training_system.sql`** - Migration DB
   - Table `training_progress` avec progression utilisateur
   - Colonne `training_completed` dans `users`
   - Indexes pour performances

### Documentation

- **`TRAINING_SYSTEM.md`** - Ce fichier

---

## 📚 Contenu de formation

### 🟢 Commercial (15 min - 5 modules)

1. **Bienvenue sur LeadSynch** (2 min)
   - Présentation plateforme
   - Objectifs formation
   - Quiz validation

2. **Votre Pipeline de Ventes** (4 min)
   - Étapes du pipeline (Cold Call → Gagné)
   - Drag & drop
   - Actions rapides (modifier, notes, demander aide/validation)
   - Quiz: "Comment déplacer un lead ?"

3. **Campagnes Email** (4 min)
   - Accès "Mes Campagnes"
   - Suivi performances (ouverture, clics)
   - Bonnes pratiques (personnalisation, timing relances)
   - Quiz: "Après combien de jours relancer ?"

4. **Asefi - Assistant IA** (3 min)
   - Fonctionnalités (rédaction emails, analyses)
   - Mode vocal
   - Exemples de demandes
   - Quiz: "Que peut faire Asefi ?"

5. **Conseils de Pro** (2 min)
   - Checklist quotidienne
   - Bonnes pratiques
   - Objectifs (5-20 deals/mois)

### 🟡 Manager (20 min - 5 modules)

1. **Bienvenue Manager** (2 min)
   - Outils de pilotage
   - Responsabilités
   - Objectifs formation

2. **Dashboard Manager** (4 min)
   - KPIs temps réel
   - Demandes validation/aide
   - Top commerciaux
   - Quiz: "Fréquence refresh ?"

3. **Créer des Campagnes** (5 min)
   - 5 étapes (objectif, ciblage, contenu, planification, suivi)
   - Mode test (5 leads)
   - Variables personnalisation
   - Quiz: "Combien de leads en mode test ?"

4. **Gérer votre Équipe** (4 min)
   - Traiter demandes validation
   - Coaching commerciaux
   - Suivi régulier (daily/hebdo/mensuel)
   - Objectifs SMART

5. **Analyses Avancées** (5 min)
   - 5 KPIs clés
   - Page Statistiques
   - Actions d'optimisation
   - Amélioration continue

### 🔴 Admin (25 min - 6 modules)

1. **Bienvenue Administrateur** (2 min)
   - Contrôle total plateforme
   - Responsabilités
   - Formation managers/commerciaux

2. **Gestion Utilisateurs** (5 min)
   - Créer utilisateurs
   - Rôles et permissions
   - Principe moindre privilège

3. **Bases de Données** (6 min)
   - Créer bases
   - Import CSV avec IA secteur
   - Génération Google Maps
   - Best practices

4. **Secteurs Géographiques** (4 min)
   - Créer secteurs
   - Assignation automatique par code postal
   - Réassignation globale
   - Statistiques par secteur

5. **Configuration Système** (5 min)
   - Variables d'environnement
   - Test Zone (health checks)
   - Monitoring
   - Sécurité

6. **Analytics Entreprise** (3 min)
   - Métriques globales
   - Par équipe/secteur
   - Exports (CSV, JSON, PDF)
   - Intégrations futures

---

## 🗄️ Structure base de données

### Table `training_progress`

```sql
CREATE TABLE training_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),

  -- Progression
  completed_modules JSONB DEFAULT '[]', -- ["comm-1", "comm-2"]
  quiz_scores JSONB DEFAULT '{}',       -- {"comm-1": 3, "comm-2": 4}
  completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `users` (ajout colonne)

```sql
ALTER TABLE users
ADD COLUMN training_completed BOOLEAN DEFAULT FALSE;
```

---

## 🔄 Workflow formation

### Premier login utilisateur

1. **Check formation complétée**
   ```javascript
   GET /api/training
   // Retourne: { training: {...}, progress: {...} }
   ```

2. **Si `training_completed = false`**, afficher modal formation

3. **Navigation modules**
   - Utilisateur lit module
   - Répond au quiz (si présent)
   - Clique "Module suivant"

4. **Complétion module**
   ```javascript
   POST /api/training/complete-module
   Body: { module_id: "comm-1", quiz_score: 3 }
   ```

5. **Progression sauvegardée**
   - `completed_modules` mis à jour
   - `quiz_scores` enregistré
   - Si tous modules complétés → `completed = true`

6. **Formation terminée**
   - `users.training_completed = true`
   - Modal ne s'affiche plus
   - Badge "Formation complétée" dans profil

### Réinitialiser formation (Admin)

```javascript
POST /api/training/reset
Body: { user_id: "uuid" }
// Supprime progress, remet training_completed à false
```

---

## 📊 Statistiques formation (Admin/Manager)

```javascript
GET /api/training/stats
// Retourne stats par rôle:
{
  stats: [
    {
      role: "commercial",
      total_users: 10,
      completed: 7,
      started: 9,
      avg_progress: 85.3
    },
    ...
  ]
}
```

---

## 🎨 Frontend - Implémentation recommandée

### Composant TrainingModal.jsx

```jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import ReactMarkdown from 'react-markdown';

export default function TrainingModal() {
  const [training, setTraining] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentModule, setCurrentModule] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadTraining();
  }, []);

  const loadTraining = async () => {
    const res = await api.get('/training');
    setTraining(res.data.training);
    setProgress(res.data.progress);

    // Afficher modal si formation non complétée
    if (!res.data.progress.completed) {
      setShowModal(true);
    }
  };

  const completeModule = async () => {
    const module = training.modules[currentModule];

    await api.post('/training/complete-module', {
      module_id: module.id,
      quiz_score: quizAnswer
    });

    if (currentModule < training.modules.length - 1) {
      setCurrentModule(currentModule + 1);
      setQuizAnswer(null);
    } else {
      // Formation terminée !
      setShowModal(false);
      alert('🎉 Formation complétée !');
    }
  };

  if (!showModal || !training) return null;

  const module = training.modules[currentModule];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{training.title}</h1>
          <p className="text-gray-600">{training.description}</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Module {currentModule + 1}/{training.modules.length}</span>
              <span>{module.duration}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${((currentModule + 1) / training.modules.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Module content */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">{module.title}</h2>

          {/* Video si présent */}
          {module.video_url && (
            <iframe
              width="100%"
              height="400"
              src={module.video_url}
              className="rounded-lg mb-4"
              allowFullScreen
            />
          )}

          {/* Contenu markdown */}
          <div className="prose max-w-none">
            <ReactMarkdown>{module.content}</ReactMarkdown>
          </div>
        </div>

        {/* Quiz si présent */}
        {module.quiz && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="font-bold mb-4">📝 Quiz de validation</h3>
            <p className="mb-4">{module.quiz.question}</p>
            <div className="space-y-2">
              {module.quiz.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="quiz"
                    value={idx}
                    checked={quizAnswer === idx}
                    onChange={() => setQuizAnswer(idx)}
                    className="w-4 h-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentModule(Math.max(0, currentModule - 1))}
            disabled={currentModule === 0}
            className="px-6 py-3 border rounded-lg disabled:opacity-50"
          >
            ← Précédent
          </button>

          <button
            onClick={completeModule}
            disabled={module.quiz && quizAnswer === null}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {currentModule === training.modules.length - 1 ? '🎉 Terminer' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Intégration dans App.jsx

```jsx
import TrainingModal from './components/TrainingModal';

function App() {
  return (
    <>
      <Routes>
        {/* ... vos routes ... */}
      </Routes>

      {/* Training modal - s'affiche automatiquement si non complétée */}
      <TrainingModal />
    </>
  );
}
```

---

## ✅ Checklist déploiement

### Base de données

- [ ] Exécuter migration `create_training_system.sql`
- [ ] Vérifier table `training_progress` créée
- [ ] Vérifier colonne `training_completed` ajoutée à `users`

### Backend

- [ ] Route `/api/training` accessible
- [ ] Tester endpoints avec Postman
- [ ] Logs confirment bon fonctionnement

### Frontend

- [ ] Créer composant `TrainingModal.jsx`
- [ ] Installer `react-markdown` : `npm install react-markdown`
- [ ] Intégrer dans `App.jsx`
- [ ] Tester avec user `training_completed = false`

### Tests

- [ ] Créer nouveau user → Modal s'affiche
- [ ] Compléter tous modules → Formation marquée complétée
- [ ] Reload page → Modal ne s'affiche plus
- [ ] Admin reset formation → Modal réapparaît

---

## 🚀 Améliorations futures

- [ ] **Vraies vidéos** - Remplacer URLs YouTube de démo
- [ ] **Certificat** - PDF généré à la fin
- [ ] **Gamification** - Points, badges, leaderboard
- [ ] **Micro-learning** - Modules courts quotidiens
- [ ] **Tests périodiques** - Refresh connaissances
- [ ] **Formation continue** - Nouvelles features
- [ ] **Analytics** - Temps passé, taux abandon
- [ ] **Traductions** - Multi-langue

---

## 📞 Support

Pour toute question sur le système de formation :
- 📧 support@leadsynch.com
- 💬 Chat Asefi dans l'application

**Document créé**: 16 novembre 2025
**Version**: 1.0.0
