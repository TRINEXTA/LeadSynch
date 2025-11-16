/**
 * Contenu de formation par rôle
 * Formation obligatoire au premier login
 */

export const TRAINING_CONTENT = {
  // ========== FORMATION COMMERCIAL ==========
  commercial: {
    role: 'commercial',
    title: 'Formation Commercial LeadSynch',
    description: 'Apprenez à utiliser LeadSynch pour maximiser vos ventes',
    duration: '15 min',
    modules: [
      {
        id: 'comm-1',
        title: '👋 Bienvenue sur LeadSynch',
        duration: '2 min',
        type: 'video',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // À remplacer par vraie vidéo
        content: `
# Bienvenue dans LeadSynch !

Vous êtes maintenant équipé d'un **outil CRM puissant** pour :
- 🎯 Gérer vos leads efficacement
- 📧 Lancer des campagnes email
- 📊 Suivre vos performances
- 💰 Convertir plus de prospects

## Ce que vous allez apprendre

Dans cette formation de 15 minutes, vous découvrirez :
1. Comment gérer votre pipeline de ventes
2. Comment créer et suivre vos campagnes
3. Les bonnes pratiques pour qualifier vos leads
4. Comment utiliser l'IA (Asefi) pour vous aider
        `,
        quiz: {
          question: 'Quelle est la durée totale de cette formation ?',
          options: ['5 minutes', '10 minutes', '15 minutes', '30 minutes'],
          correct: 2
        }
      },
      {
        id: 'comm-2',
        title: '📊 Votre Pipeline de Ventes',
        duration: '4 min',
        type: 'interactive',
        content: `
# Le Pipeline : Votre tableau de bord principal

## Étapes du pipeline
Vos leads progressent à travers ces étapes :

1. **❄️ Cold Call** - Premier contact
2. **👆 Leads Click** - Intérêt manifesté
3. **📞 NRP** - Non répondu (à relancer)
4. **✅ Qualifié** - Prospect intéressé
5. **⭐ Très Qualifié** - Forte probabilité
6. **💼 Proposition** - Devis envoyé
7. **🎉 Gagné** - Deal conclu !

## Drag & Drop
Glissez-déposez vos leads d'une étape à l'autre en temps réel.

## Actions rapides
Sur chaque lead :
- ✏️ Modifier les informations
- 📝 Ajouter des notes
- 📅 Planifier un suivi
- 🆘 **Demander de l'aide** à votre manager
- ✅ **Demander validation** pour un deal important
        `,
        quiz: {
          question: 'Comment déplacer un lead d\'une étape à l\'autre ?',
          options: [
            'Cliquer sur le bouton modifier',
            'Glisser-déposer (drag & drop)',
            'Envoyer un email',
            'Appeler le support'
          ],
          correct: 1
        }
      },
      {
        id: 'comm-3',
        title: '📧 Campagnes Email',
        duration: '4 min',
        type: 'tutorial',
        content: `
# Lancer une campagne email

## Étape 1 : Accéder aux campagnes
Dans le menu, cliquez sur **"Mes Campagnes"**

## Étape 2 : Voir les campagnes assignées
Vous verrez toutes les campagnes créées par les managers auxquelles vous êtes assigné.

## Étape 3 : Suivre les performances
Pour chaque campagne, vous pouvez voir :
- 📨 **Emails envoyés**
- 👁️ **Taux d'ouverture**
- 🖱️ **Taux de clics**
- ✅ **Conversions**

## 📋 Bonnes pratiques
- ✅ Personnalisez vos emails
- ✅ Relancez après 3-4 jours
- ✅ Utilisez les templates IA (Asefi)
- ❌ N'envoyez pas trop d'emails d'un coup
- ❌ Ne spammez jamais
        `,
        quiz: {
          question: 'Après combien de jours faut-il relancer un prospect ?',
          options: ['1 jour', '2-3 jours', '3-4 jours', '1 semaine'],
          correct: 2
        }
      },
      {
        id: 'comm-4',
        title: '🤖 Asefi - Votre Assistant IA',
        duration: '3 min',
        type: 'demo',
        content: `
# Asefi : L'IA qui vous aide à vendre

## Qu'est-ce qu'Asefi ?
Asefi est votre **assistant IA intelligent** qui peut :
- ✍️ Rédiger des emails personnalisés
- 💡 Suggérer des arguments de vente
- 📊 Analyser vos performances
- 🆘 Répondre à vos questions

## Comment l'utiliser ?
1. Cliquez sur le **bouton chatbot** (en bas à droite)
2. Posez votre question ou demandez de l'aide
3. Asefi vous répond instantanément !

## Exemples de demandes
- "Rédige un email de relance pour un prospect dans le juridique"
- "Quels sont mes leads les plus chauds ?"
- "Comment améliorer mon taux de conversion ?"
- "Explique-moi comment fonctionne le scoring"

## 🎤 Mode vocal
Vous pouvez même parler à Asefi ! Cliquez sur le micro et posez votre question.
        `,
        quiz: {
          question: 'Que peut faire Asefi pour vous ?',
          options: [
            'Seulement répondre aux questions',
            'Rédiger des emails et analyser les performances',
            'Passer des appels téléphoniques',
            'Envoyer des SMS'
          ],
          correct: 1
        }
      },
      {
        id: 'comm-5',
        title: '🎯 Conseils de Pro',
        duration: '2 min',
        type: 'checklist',
        content: `
# Les clés du succès commercial

## ✅ Checklist quotidienne
- [ ] Consulter le pipeline dès le matin
- [ ] Relancer les leads "NRP"
- [ ] Qualifier au moins 3 nouveaux leads
- [ ] Ajouter des notes sur les appels importants
- [ ] Demander de l'aide si bloqué

## 💎 Bonnes pratiques
1. **Soyez réactif** - Répondez vite aux demandes
2. **Qualifiez bien** - Un lead mal qualifié = temps perdu
3. **Utilisez Asefi** - Gagnez du temps avec l'IA
4. **Demandez de l'aide** - Vos managers sont là pour vous
5. **Célébrez vos victoires** - Chaque deal gagné compte !

## 📈 Objectifs
Fixez-vous des objectifs réalistes :
- **Débutant** : 5 deals/mois
- **Confirmé** : 10 deals/mois
- **Expert** : 20+ deals/mois

Vous êtes prêt ! 🚀
        `
      }
    ]
  },

  // ========== FORMATION MANAGER ==========
  manager: {
    role: 'manager',
    title: 'Formation Manager LeadSynch',
    description: 'Pilotez vos équipes et campagnes efficacement',
    duration: '20 min',
    modules: [
      {
        id: 'mgr-1',
        title: '👔 Bienvenue Manager',
        duration: '2 min',
        type: 'video',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        content: `
# Bienvenue dans LeadSynch - Manager

En tant que **Manager**, vous avez accès à des outils puissants pour :
- 📊 Piloter vos équipes commerciales
- 🎯 Créer et suivre les campagnes
- ✅ Valider les deals importants
- 🆘 Aider vos commerciaux
- 📈 Analyser les performances

## Ce que vous allez apprendre
1. Dashboard Manager et KPIs
2. Création de campagnes avancées
3. Gestion des demandes de validation
4. Coaching et suivi des commerciaux
5. Analyse des performances
        `
      },
      {
        id: 'mgr-2',
        title: '📊 Dashboard Manager',
        duration: '4 min',
        type: 'interactive',
        content: `
# Votre Dashboard Manager

## Vue d'ensemble
Le Dashboard Manager vous donne :
- 📈 **KPIs temps réel** (30s refresh)
- 👥 **Performance équipe**
- 🎯 **Taux de conversion**
- ⏰ **Demandes en attente**

## Demandes de validation
Vos commerciaux peuvent vous demander :
1. **Validation** - Approuver un deal important
2. **Aide** - Débloquer une situation

### Comment traiter une demande
1. Consultez le lead concerné
2. Analysez le contexte
3. **Approuvez** ou **Refusez** avec un commentaire
4. Le commercial est notifié instantanément

## Top commerciaux
Suivez les performances de votre équipe :
- 🥇 Top performers
- 📉 Commerciaux à coacher
- 🎯 Objectifs atteints
        `,
        quiz: {
          question: 'À quelle fréquence le Dashboard Manager se rafraîchit-il ?',
          options: ['10 secondes', '30 secondes', '1 minute', '5 minutes'],
          correct: 1
        }
      },
      {
        id: 'mgr-3',
        title: '🎯 Créer des Campagnes',
        duration: '5 min',
        type: 'tutorial',
        content: `
# Créer une campagne performante

## Étape 1 : Définir l'objectif
- Prospection nouvelle clientèle ?
- Réactivation clients inactifs ?
- Upsell clients existants ?

## Étape 2 : Cibler
1. Choisir la **base de données**
2. Filtrer par **secteur** (optionnel)
3. Filtrer par **statut lead**

## Étape 3 : Contenu
- Choisir un **template** ou créer custom
- Personnaliser avec variables : {{company_name}}, {{contact_name}}
- Utiliser **Asefi** pour générer du contenu IA

## Étape 4 : Planifier
- Mode test : 5 leads (pour tester)
- Lancement immédiat ou programmé
- Assignation aux commerciaux

## Étape 5 : Suivre
- Taux d'ouverture en temps réel
- Taux de clics
- Conversions
- Ajuster si besoin (pause/relance)
        `,
        quiz: {
          question: 'Combien de leads sont envoyés en mode test ?',
          options: ['3 leads', '5 leads', '10 leads', '20 leads'],
          correct: 1
        }
      },
      {
        id: 'mgr-4',
        title: '👥 Gérer votre Équipe',
        duration: '4 min',
        type: 'best-practices',
        content: `
# Coaching & Management

## Demandes de validation
Quand un commercial demande validation :
- ✅ **Répondez vite** (< 4h idéalement)
- 💬 **Donnez du feedback** constructif
- 🎓 **Expliquez** votre décision
- 📚 **Formez** si nécessaire

## Demandes d'aide
Quand un commercial est bloqué :
- 🆘 **Traitez en priorité**
- 📞 **Appelez** si critique
- 💡 **Partagez** bonnes pratiques
- 🤝 **Accompagnez** sur le terrain si besoin

## Suivi régulier
- **Daily** : Check dashboard (5 min)
- **Hebdo** : One-on-one avec chaque commercial (15 min)
- **Mensuel** : Analyse performances détaillée (1h)
- **Trimestriel** : Objectifs et évolution (2h)

## 🎯 Objectifs SMART
Fixez des objectifs :
- **S**pécifiques
- **M**esurables
- **A**tteignables
- **R**éalistes
- **T**emporels
        `
      },
      {
        id: 'mgr-5',
        title: '📈 Analyses Avancées',
        duration: '5 min',
        type: 'analytics',
        content: `
# Analyser pour optimiser

## KPIs clés à suivre
1. **Taux de conversion** - Leads → Deals gagnés
2. **Cycle de vente** - Temps moyen pour closer
3. **Taux d'ouverture email** - Qualité messaging
4. **Taux de clics** - Pertinence contenu
5. **Pipeline velocity** - Vitesse progression leads

## Page Statistiques
Consultez régulièrement :
- Répartition par statut
- Top 5 secteurs
- Performance campagnes
- Activité équipe

## Actions d'optimisation
Si **taux conversion bas** :
- Revoir qualification leads
- Former commerciaux
- Améliorer argumentaire

Si **taux ouverture bas** :
- Tester nouveaux sujets email
- Vérifier réputation expéditeur
- Segmenter mieux

Si **cycle vente long** :
- Simplifier process
- Automatiser relances
- Identifier goulots d'étranglement

## 🚀 Amélioration continue
Testez, mesurez, ajustez, répétez !
        `
      }
    ]
  },

  // ========== FORMATION ADMIN ==========
  admin: {
    role: 'admin',
    title: 'Formation Administrateur LeadSynch',
    description: 'Configuration et gestion complète de la plateforme',
    duration: '25 min',
    modules: [
      {
        id: 'adm-1',
        title: '⚙️ Bienvenue Administrateur',
        duration: '2 min',
        type: 'video',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        content: `
# Formation Administrateur LeadSynch

En tant qu'**Administrateur**, vous contrôlez tout :
- 👥 Gestion utilisateurs et rôles
- 🗄️ Configuration bases de données
- 🌍 Secteurs géographiques
- 🎯 Campagnes globales
- ⚙️ Configuration système
- 📊 Analytics entreprise

## Responsabilités
1. Créer et gérer les utilisateurs
2. Organiser les équipes
3. Importer et structurer les données
4. Configurer les intégrations (APIs)
5. Surveiller la santé du système
6. Former les managers et commerciaux
        `
      },
      {
        id: 'adm-2',
        title: '👥 Gestion Utilisateurs',
        duration: '5 min',
        type: 'tutorial',
        content: `
# Gérer vos utilisateurs

## Créer un utilisateur
1. Menu **Équipe** → **Ajouter un utilisateur**
2. Remplir :
   - Nom, prénom, email
   - **Rôle** : Admin / Manager / Commercial
   - **Équipe** (optionnel)
   - **Manager** (pour commerciaux)

## Rôles et permissions

### 🔴 Administrateur
- Accès total
- Gestion utilisateurs
- Configuration système
- Toutes les campagnes

### 🟡 Manager
- Dashboard manager
- Créer campagnes
- Gérer son équipe
- Valider deals

### 🟢 Commercial
- Pipeline personnel
- Campagnes assignées
- Demander aide/validation

## Bonnes pratiques
- ✅ Principe du moindre privilège
- ✅ Révoquer accès si départ
- ✅ Audit régulier des permissions
- ✅ Former avant donner accès
        `
      },
      {
        id: 'adm-3',
        title: '🗄️ Bases de Données',
        duration: '6 min',
        type: 'advanced',
        content: `
# Organiser vos données

## Créer une base
Menu **Bases de Données** → **Créer**
- **Nom** descriptif (ex: "Prospects Juridique Paris")
- **Description**
- **Source** (Import, API, Génération)

## Import CSV
1. Préparer fichier CSV :
   - company_name (requis)
   - email, phone
   - address, postal_code, city
   - sector (détecté par IA si absent)

2. Upload et mapping
   - LeadSynch détecte les colonnes
   - **IA Claude** détecte le secteur auto
   - Vérification doublons

3. Assignation automatique
   - Secteur géographique par code postal
   - Scoring automatique
   - Répartition équipe

## Génération Google Maps
1. Menu **Générer Leads**
2. Critères :
   - **Secteur** (ex: "restaurant")
   - **Localisation** (ville ou code postal)
   - **Limite** (max leads)

3. Résultat :
   - Nom, adresse, téléphone auto
   - Google Maps rating
   - Ajouté à base sélectionnée

## 🎯 Best Practices
- Segmentez par secteur/zone géo
- Nettoyez régulièrement (doublons)
- Enrichissez avec données externes
- Documentez les sources
        `
      },
      {
        id: 'adm-4',
        title: '🌍 Secteurs Géographiques',
        duration: '4 min',
        type: 'configuration',
        content: `
# Découpage géographique

## Créer un secteur
Menu **Secteurs Géographiques** → **Nouveau secteur**
- **Nom** (ex: "Paris Centre")
- **Codes postaux** (ex: 75001-75004)
- **Manager assigné**
- **Commerciaux** de ce secteur

## Assignation automatique
Quand un lead est importé :
1. LeadSynch lit le **code postal**
2. Trouve le **secteur correspondant**
3. Assigne au **manager** du secteur
4. Notifie les **commerciaux**

## Réassignation globale
Si vous changez les secteurs :
- Bouton **"Réassigner tous les leads"**
- Tous les leads sont réattribués
- Basé sur code postal actuel

## Statistiques
Pour chaque secteur :
- Total leads
- Leads actifs
- Leads qualifiés
- Taux de conversion

## 💡 Cas d'usage
- Organisation par **région**
- Découpage **urbain/rural**
- Segmentation **zones premium**
        `
      },
      {
        id: 'adm-5',
        title: '⚙️ Configuration Système',
        duration: '5 min',
        type: 'technical',
        content: `
# Configuration technique

## Variables d'environnement
Configurées dans **.env** :

### Obligatoires
- \`POSTGRES_URL\` - Base de données
- \`JWT_SECRET\` - Authentification
- \`ELASTIC_EMAIL_API_KEY\` - Emails

### APIs externes
- \`ANTHROPIC_API_KEY\` - IA Asefi
- \`GOOGLE_MAPS_API_KEY\` - Génération leads
- \`HUNTER_API_KEY\` - Vérification emails

### Configuration email
- \`EMAIL_FROM\` - Expéditeur (ex: noreply@company.com)
- \`EMAIL_REPLY_TO\` - Adresse de réponse

## Test Zone
Menu **Zone Test** :
- ✅ Connexion base de données
- ✅ Configuration email
- ✅ APIs externes
- ✅ Système campagnes
- ✅ Tracking
- ✅ Workers background

Tous les tests doivent être **verts** ✅

## Monitoring
- Dashboard temps réel (30s)
- Health checks réguliers
- Logs erreurs
- Performance queries

## 🔒 Sécurité
- HTTPS obligatoire en production
- JWT avec expiration
- Rate limiting activé
- Isolation tenant stricte
        `
      },
      {
        id: 'adm-6',
        title: '📊 Analytics Entreprise',
        duration: '3 min',
        type: 'reporting',
        content: `
# Vue d'ensemble entreprise

## Métriques globales
- Total leads dans le système
- Total utilisateurs actifs
- Total campagnes lancées
- Revenus générés

## Par équipe
- Performance commerciaux
- Managers les plus efficaces
- Équipes champion

## Par secteur
- Secteurs les plus performants
- Zones géographiques ROI+
- Opportunités inexploitées

## Exports
Exportez vos données :
- CSV pour Excel
- JSON pour intégrations
- PDF pour rapports

## Intégrations futures
LeadSynch peut s'intégrer avec :
- 📊 Tableau, PowerBI
- 💼 Salesforce, HubSpot
- 📧 Mailchimp, SendGrid
- 📞 Aircall, RingOver

## 🚀 Roadmap
Fonctionnalités à venir :
- Webhooks personnalisés
- API publique complète
- Mobile app iOS/Android
- Intégrations natives
        `
      }
    ]
  }
};

/**
 * Retourne le contenu de formation pour un rôle
 */
export function getTrainingByRole(role) {
  return TRAINING_CONTENT[role] || TRAINING_CONTENT.commercial;
}

/**
 * Vérifie si un utilisateur a complété sa formation
 */
export function isTrainingCompleted(userProgress, role) {
  const training = getTrainingByRole(role);
  if (!training || !userProgress) return false;

  const totalModules = training.modules.length;
  const completedModules = userProgress.completed_modules?.length || 0;

  return completedModules >= totalModules;
}
