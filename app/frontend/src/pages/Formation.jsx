import { log, error, warn } from "../lib/logger.js";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, PlayCircle, CheckCircle, Book, Target, Mail,
  Phone, Users, Database, BarChart3, Zap, ArrowRight, Clock,
  Award, ChevronDown, ChevronUp, Video, FileText, Sparkles
} from 'lucide-react';

export default function Formation() {
  const { user } = useAuth();
  const [expandedModules, setExpandedModules] = useState({});
  const [completedLessons, setCompletedLessons] = useState([]);

  // Déterminer si l'utilisateur est Manager ou Admin
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const toggleModule = (moduleId) => {
    setExpandedModules({
      ...expandedModules,
      [moduleId]: !expandedModules[moduleId]
    });
  };

  const markAsCompleted = (lessonId) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons([...completedLessons, lessonId]);
    }
  };

  const modules = [
    {
      id: 'getting-started',
      title: 'Démarrage Rapide',
      icon: Zap,
      color: 'blue',
      duration: '30 min',
      lessons: [
        {
          id: 'intro',
          title: 'Introduction à LeadSynch',
          type: 'video',
          duration: '5 min',
          content: `Découvrez les fonctionnalités principales de LeadSynch :
- Dashboard avec statistiques en temps réel
- Gestion multi-tenant sécurisée
- Campagnes email et appels automatisées
- Pipeline commercial intelligent
- Scoring et qualification automatique des leads`
        },
        {
          id: 'first-login',
          title: 'Première connexion et configuration',
          type: 'guide',
          duration: '10 min',
          content: `Étapes pour bien démarrer :
1. Connectez-vous avec vos identifiants
2. Complétez votre profil utilisateur
3. Configurez votre signature email
4. Paramétrez vos notifications
5. Découvrez le dashboard`
        },
        {
          id: 'navigation',
          title: 'Navigation dans l\'interface',
          type: 'guide',
          duration: '15 min',
          content: `Organisation de l'interface :
- Sidebar : Menu principal avec sections collapsibles
- Dashboard : Vue d'ensemble de votre activité
- Header : Notifications et profil utilisateur
- Raccourcis clavier disponibles`
        }
      ]
    },
    {
      id: 'leads-management',
      title: 'Gestion des Leads',
      icon: Database,
      color: 'green',
      duration: '1h',
      lessons: [
        {
          id: 'import-csv',
          title: 'Importer des leads depuis CSV',
          type: 'video',
          duration: '15 min',
          content: `Comment importer vos prospects :
1. Préparez votre fichier CSV avec les colonnes : Email, Nom Entreprise, Contact, Téléphone, Secteur
2. Allez dans "Bases de Données" → "Importer des Leads"
3. Glissez-déposez votre fichier ou cliquez pour sélectionner
4. L'IA détecte automatiquement les secteurs
5. Vérifiez la blacklist RGPD avant validation
6. Confirmez l'import`
        },
        {
          id: 'generate-leads',
          title: 'Générer des leads avec Google Maps',
          type: 'video',
          duration: '20 min',
          content: `Utiliser la génération automatique :
1. Accédez à "Génération IA" → "Génération de Leads"
2. Sélectionnez un secteur d'activité
3. Choisissez une localisation (ville, région)
4. Définissez le nombre de résultats souhaités
5. Lancez la recherche
6. LeadSynch extrait automatiquement les données via Google Maps API
7. Les leads sont ajoutés à votre base`
        },
        {
          id: 'scoring',
          title: 'Scoring et qualification',
          type: 'guide',
          duration: '15 min',
          content: `Système de scoring automatique :
- Score basé sur l'engagement (ouvertures, clics)
- Qualification par étapes du pipeline
- Attribution automatique de tags
- Priorisation des leads chauds
- Alertes pour leads prioritaires`
        },
        {
          id: 'duplicate-detection',
          title: 'Détecter et gérer les doublons',
          type: 'guide',
          duration: '10 min',
          content: `Nettoyage de votre base :
1. Allez dans "Génération IA" → "Détecter Doublons"
2. Le système analyse automatiquement vos leads
3. Les doublons sont identifiés par email et nom d'entreprise
4. Fusionnez ou supprimez les doublons
5. Conservez l'historique du lead le plus complet`
        }
      ]
    },
    {
      id: 'campaigns',
      title: 'Campagnes Marketing',
      icon: Mail,
      color: 'purple',
      duration: '1h 30min',
      lessons: [
        {
          id: 'email-templates',
          title: 'Créer des templates email avec Asefi',
          type: 'video',
          duration: '20 min',
          content: `Utiliser l'assistant IA Asefi :
1. Accédez à "Email Marketing" → "Templates Email"
2. Cliquez sur "Générer avec Asefi"
3. Décrivez votre besoin (ex: "Email de relance pour prospects IT")
4. Asefi génère automatiquement sujet + contenu personnalisé
5. Personnalisez avec des variables : {company_name}, {contact_name}
6. Prévisualisez et enregistrez`
        },
        {
          id: 'create-campaign',
          title: 'Lancer une campagne email',
          type: 'video',
          duration: '25 min',
          content: `Créer et lancer votre campagne :
1. "Gestion Campagnes" → "Nouvelle Campagne"
2. Nommez votre campagne
3. Sélectionnez une base de données et secteurs
4. Choisissez un template email
5. Planifiez l'envoi (immédiat ou programmé)
6. Activez le tracking (opens, clicks)
7. Lancez la campagne
8. Suivez les statistiques en temps réel`
        },
        {
          id: 'campaign-phoning',
          title: 'Campagne d\'appels téléphoniques',
          type: 'video',
          duration: '25 min',
          content: `Système de campagnes appels :
1. Créez une campagne de type "Appel"
2. Assignez des commerciaux
3. Chaque commercial reçoit 50 prospects en pipeline
4. Après 10 qualifications, 50 nouveaux prospects auto-ajoutés
5. Utilisez le "Mode Prospection" pour appeler
6. Qualifiez directement (RDV, Non intéressé, etc.)
7. Le pipeline se remplit automatiquement`
        },
        {
          id: 'tracking-analytics',
          title: 'Tracking et Analytics',
          type: 'guide',
          duration: '20 min',
          content: `Analyser vos performances :
- Taux d'ouverture email
- Taux de clics
- Conversions par étape du pipeline
- Top commerciaux
- Meilleurs secteurs
- ROI par campagne
- Rapports exportables en PDF`
        }
      ]
    },
    {
      id: 'commercial-pipeline',
      title: 'Pipeline Commercial',
      icon: Target,
      color: 'orange',
      duration: '45 min',
      lessons: [
        {
          id: 'pipeline-stages',
          title: 'Comprendre les étapes du pipeline',
          type: 'guide',
          duration: '15 min',
          content: `Les 6 étapes du pipeline LeadSynch :
1. Clicked : Le prospect a cliqué sur un lien email
2. Contacted : Premier contact établi
3. Interested : Intérêt confirmé
4. Meeting : RDV planifié
5. Proposal : Devis envoyé
6. Won/Lost : Deal gagné ou perdu

Chaque étape déclencheimplique des actions automatiques.`
        },
        {
          id: 'drag-and-drop',
          title: 'Utiliser le Kanban drag & drop',
          type: 'video',
          duration: '15 min',
          content: `Gérer visuellement votre pipeline :
1. Accédez à "Pipeline Commercial"
2. Visualisez tous vos leads par étape
3. Glissez-déposez pour changer d'étape
4. Cliquez sur un lead pour voir les détails
5. Ajoutez des notes et tâches
6. Planifiez des rappels`
        },
        {
          id: 'follow-ups',
          title: 'Rappels et tâches automatiques',
          type: 'guide',
          duration: '15 min',
          content: `Système de rappels intelligent :
- Rappels créés automatiquement lors d'un RDV
- Notifications par email pour tâches urgentes
- Vue "Mes Rappels" pour gérer votre agenda
- Prioritisation automatique
- Synchronisation avec le pipeline
- Alertes pour leads inactifs depuis X jours`
        }
      ]
    },
    {
      id: 'team-management',
      title: 'Gestion d\'Équipe (Managers)',
      icon: Users,
      color: 'pink',
      duration: '1h',
      managerOnly: true, // ✅ MODULE RÉSERVÉ AUX MANAGERS
      lessons: [
        {
          id: 'create-users',
          title: 'Créer et gérer des utilisateurs',
          type: 'guide',
          duration: '20 min',
          content: `Administration des utilisateurs :
1. Accédez à "Administration" → "Utilisateurs"
2. Créez un nouvel utilisateur
3. Choisissez le rôle : Admin, Manager, Commercial
4. Un mot de passe temporaire est envoyé par email
5. Assignez à une équipe
6. Bloquez/débloquez un compte si nécessaire
7. Forcez le changement de mot de passe`
        },
        {
          id: 'manager-role',
          title: 'Rôle Manager : Droits et responsabilités',
          type: 'guide',
          duration: '20 min',
          content: `Privilèges du Manager :
- Tout ce qu'un Commercial peut faire
- Créer et gérer des campagnes
- Assigner des leads à l'équipe
- Valider les devis
- Approuver les contrats
- Monitorer l'activité de l'équipe
- Recevoir les demandes d'aide urgentes
- Dashboard Manager dédié`
        },
        {
          id: 'validation-workflow',
          title: 'Workflow de validation (Devis, Contrats)',
          type: 'video',
          duration: '20 min',
          content: `Circuit de validation :
1. Commercial crée un devis dans le pipeline
2. Devis passe en statut "En attente validation"
3. Manager reçoit une notification email
4. Manager examine le devis
5. Manager approuve ou refuse avec commentaires
6. Si approuvé : le commercial peut envoyer au client
7. Tracking de toutes les validations`
        }
      ]
    },
    {
      id: 'rgpd-compliance',
      title: 'Conformité RGPD',
      icon: Award,
      color: 'red',
      duration: '30 min',
      lessons: [
        {
          id: 'unsubscribe-system',
          title: 'Système de désabonnement',
          type: 'guide',
          duration: '15 min',
          content: `Protection RGPD automatique :
- Lien de désabonnement dans chaque email
- Blacklist multi-tenant (isolée par client)
- Vérification automatique avant import CSV
- Alerte si tentative d'envoi à un désabonné
- Système 3 strikes pour violations :
  * 1ère violation : Email d'avertissement
  * 2ème violation : Avertissement sérieux
  * 3ème violation : Blocage du compte`
        },
        {
          id: 'data-protection',
          title: 'Protection des données',
          type: 'guide',
          duration: '15 min',
          content: `Sécurité des données :
- Isolation multi-tenant stricte
- Chiffrement des données sensibles
- Logs d'audit pour toutes les actions
- Suppression définitive sur demande
- Export de données (portabilité)
- Conformité au RGPD européen`
        }
      ]
    }
  ];

  const getTotalLessons = () => {
    return modules.reduce((acc, module) => acc + module.lessons.length, 0);
  };

  const getCompletionRate = () => {
    const total = getTotalLessons();
    return total > 0 ? Math.round((completedLessons.length / total) * 100) : 0;
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500' },
      green: { bg: 'bg-green-100', text: 'text-green-600', gradient: 'from-green-500 to-green-600', border: 'border-green-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600', border: 'border-purple-500' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600', border: 'border-orange-500' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', gradient: 'from-pink-500 to-pink-600', border: 'border-pink-500' },
      red: { bg: 'bg-red-100', text: 'text-red-600', gradient: 'from-red-500 to-red-600', border: 'border-red-500' }
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Centre de Formation
              </h1>
              <p className="text-gray-600 text-lg font-medium mt-1">
                Maîtrisez LeadSynch de A à Z avec nos guides interactifs
              </p>
            </div>
          </div>

          {/* Progression globale */}
          <Card className="border-2 border-indigo-200 shadow-xl bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-indigo-600" />
                  <span className="font-bold text-gray-900">Votre progression</span>
                </div>
                <span className="text-3xl font-bold text-indigo-600">{getCompletionRate()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${getCompletionRate()}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>{completedLessons.length} / {getTotalLessons()} leçons complétées</span>
                <span>{modules.length} modules disponibles</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Modules</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{modules.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Book className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Leçons totales</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{getTotalLessons()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <PlayCircle className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Temps estimé</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">6h</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules de formation */}
        <div className="space-y-6">
          {modules
            // ✅ FILTRER LES MODULES PAR RÔLE : n'afficher les modules "managerOnly" qu'aux managers/admins
            .filter(module => !module.managerOnly || isManager)
            .map((module, index) => {
            const Icon = module.icon;
            const colors = getColorClasses(module.color);
            const isExpanded = expandedModules[module.id];
            const moduleCompletedLessons = module.lessons.filter(l =>
              completedLessons.includes(l.id)
            ).length;
            const moduleProgress = Math.round((moduleCompletedLessons / module.lessons.length) * 100);

            return (
              <Card
                key={module.id}
                className={`border-2 ${colors.border} shadow-xl transition-all duration-300 ${
                  isExpanded ? 'scale-[1.02]' : 'hover:shadow-2xl'
                }`}
              >
                <CardHeader
                  className={`bg-gradient-to-r from-${module.color}-50 to-${module.color}-100 border-b cursor-pointer`}
                  onClick={() => toggleModule(module.id)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md font-bold text-lg">
                        {index + 1}
                      </div>
                      <div className={`p-3 ${colors.bg} rounded-xl`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{module.title}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {module.duration}
                          </span>
                          <span>•</span>
                          <span>{module.lessons.length} leçons</span>
                          <span>•</span>
                          <span className="font-semibold">{moduleProgress}% complété</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-600" />
                    )}
                  </CardTitle>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isCompleted = completedLessons.includes(lesson.id);
                        const LessonIcon = lesson.type === 'video' ? Video : FileText;

                        return (
                          <div
                            key={lesson.id}
                            className={`p-5 border-2 rounded-xl transition-all ${
                              isCompleted
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 bg-gray-100 border-2 border-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">
                                    {lessonIndex + 1}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-lg">
                                      {lesson.title}
                                    </h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                      <span className="flex items-center gap-1">
                                        <LessonIcon className="w-4 h-4" />
                                        {lesson.type === 'video' ? 'Vidéo' : 'Guide'}
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {lesson.duration}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                                  {lesson.content}
                                </div>

                                {!isCompleted && (
                                  <button
                                    onClick={() => markAsCompleted(lesson.id)}
                                    className={`px-6 py-2.5 bg-gradient-to-r ${colors.gradient} text-white rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-md hover:shadow-lg`}
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                    Marquer comme terminé
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Call to action */}
        <Card className="mt-8 border-2 border-indigo-300 shadow-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-90" />
              <h3 className="text-3xl font-bold mb-3">
                Besoin d'aide personnalisée ?
              </h3>
              <p className="text-indigo-100 text-lg mb-6 max-w-2xl mx-auto">
                Contactez notre équipe support ou utilisez Asefi, votre assistant IA,
                pour obtenir des réponses instantanées à vos questions.
              </p>
              <button className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto">
                <Sparkles className="w-6 h-6" />
                Parler à Asefi
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
