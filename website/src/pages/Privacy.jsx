import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <Shield className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Politique de Confidentialité
            </h1>
            <p className="text-lg text-gray-600">
              Vos données sont protégées et traitées en conformité avec le RGPD
            </p>
          </div>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <p className="text-sm text-gray-500 mb-4">
                Date de dernière mise à jour : Avril 2025
              </p>
              <p className="mb-3">
                TrusTech IT Support (ci-après  nous ,  notre  ou  LeadSynch ) s'engage à protéger la vie privée des utilisateurs 
                de sa plateforme LeadSynch accessible à l'adresse www.leadsynch.com. La présente Politique de Confidentialité explique 
                comment nous collectons, utilisons, stockons et protégeons vos données personnelles.
              </p>
              <p>
                Cette politique est conforme au Règlement Général sur la Protection des Données (RGPD - UE 2016/679) et à la 
                loi Informatique et Libertés du 6 janvier 1978 modifiée.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-600" />
                1. Responsable du Traitement
              </h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="mb-2"><strong>Responsable :</strong> TrusTech IT Support</p>
                <p className="mb-2"><strong>Adresse :</strong> 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</p>
                <p className="mb-2"><strong>SIRET :</strong> 94202008200015</p>
                <p className="mb-2"><strong>Email :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a></p>
                <p><strong>DPO :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a></p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Eye className="w-6 h-6 text-blue-600" />
                2. Données Collectées
              </h2>
              <p className="mb-4">Nous collectons différents types de données selon votre utilisation de LeadSynch :</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.1 Données d'identification</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Nom et prénom</li>
                <li>Adresse email professionnelle</li>
                <li>Numéro de téléphone</li>
                <li>Raison sociale et SIRET de votre entreprise</li>
                <li>Adresse de facturation</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.2 Données de connexion et d'utilisation</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Adresse IP</li>
                <li>Type de navigateur et système d'exploitation</li>
                <li>Pages visitées et actions effectuées</li>
                <li>Date et heure de connexion</li>
                <li>Données d'utilisation de la plateforme (leads créés, emails envoyés, etc.)</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.3 Données de paiement</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Informations de carte bancaire (traitées par notre prestataire de paiement certifié PCI-DSS)</li>
                <li>Historique des transactions</li>
                <li>Factures</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.4 Données générées par l'utilisateur</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Leads créés ou importés (noms, emails, téléphones des prospects)</li>
                <li>Templates d'emails créés</li>
                <li>Campagnes de prospection</li>
                <li>Notes et commentaires</li>
                <li>Contenus générés avec l'IA Asefi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-blue-600" />
                3. Finalités du Traitement
              </h2>
              <p className="mb-4">Vos données sont collectées et traitées pour les finalités suivantes :</p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Fourniture du service</h4>
                  <p className="text-sm">Créer et gérer votre compte, vous donner accès aux fonctionnalités de LeadSynch</p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Exécution du contrat</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Facturation et paiement</h4>
                  <p className="text-sm">Gérer les abonnements, éditer les factures, traiter les paiements</p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Exécution du contrat + Obligation légale</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Sécurité et fraude</h4>
                  <p className="text-sm">Prévenir les abus, détecter les fraudes, assurer la sécurité de la plateforme</p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Intérêt légitime</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Amélioration du service</h4>
                  <p className="text-sm">Analyser l'utilisation, améliorer les fonctionnalités, développer de nouvelles features</p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Intérêt légitime</p>
                </div>
                
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Enrichissement de la base de données et amélioration des algorithmes</h4>
                  <p className="text-sm mb-2">
                    Les bases de données de leads que vous importez sont conservées en interne pour enrichir notre base 
                    de données globale et améliorer nos algorithmes de recherche, d'enrichissement de leads et de qualification.
                  </p>
                  <p className="text-sm mb-2">
                    Ces données permettent d'optimiser la qualité des résultats, d'entraîner nos modèles d'IA et de développer 
                    de nouvelles fonctionnalités pour tous les utilisateurs.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Note :</strong> Ces données restent confidentielles et ne sont jamais revendues à des tiers.
                  </p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Intérêt légitime</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Communication</h4>
                  <p className="text-sm">Envoi d'emails de service, notifications, support client, newsletters (avec consentement)</p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Exécution du contrat + Consentement</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Obligations légales</h4>
                  <p className="text-sm">Respect des obligations comptables, fiscales et juridiques</p>
                  <p className="text-xs text-gray-500 mt-1"><strong>Base légale :</strong> Obligation légale</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Lock className="w-6 h-6 text-blue-600" />
                4. Partage des Données
              </h2>
              <p className="mb-4">Nous ne vendons jamais vos données personnelles. Vos données peuvent être partagées avec :</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.1 Prestataires de services</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Hébergement :</strong> OVH (France) - Serveurs sécurisés en France</li>
                <li><strong>Paiement :</strong> Stripe - Prestataire certifié PCI-DSS</li>
                <li><strong>Intelligence Artificielle :</strong> Anthropic (Claude AI) - Pour Asefi</li>
                <li><strong>Analytics :</strong> Google Analytics (données anonymisées)</li>
                <li><strong>Emailing :</strong> SendGrid - Pour l'envoi d'emails transactionnels</li>
              </ul>
              <p className="text-sm text-gray-600 mb-4">
                Tous nos prestataires sont soumis à des obligations strictes de confidentialité et de sécurité.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.2 Autorités publiques</h3>
              <p>
                Nous pouvons divulguer vos données si la loi l'exige (autorités judiciaires, fiscales, etc.).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Durée de Conservation</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold"></span>
                  <div>
                    <strong>Données de compte actif :</strong> Conservées tant que votre compte est actif
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold"></span>
                  <div>
                    <strong>Après résiliation :</strong> 30 jours (puis suppression définitive)
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold"></span>
                  <div>
                    <strong>Données de facturation :</strong> 10 ans (obligation légale comptable)
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold"></span>
                  <div>
                    <strong>Données importées (leads) :</strong> Conservées en interne pour améliorer nos algorithmes
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold"></span>
                  <div>
                    <strong>Logs de connexion :</strong> 12 mois maximum
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold"></span>
                  <div>
                    <strong>Données anonymisées :</strong> Conservées indéfiniment pour analyses statistiques
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Sécurité des Données</h2>
              <p className="mb-4">Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Chiffrement</h4>
                  <p className="text-sm">SSL/TLS pour toutes les communications</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Authentification</h4>
                  <p className="text-sm">Mots de passe hashés, 2FA disponible</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Backup</h4>
                  <p className="text-sm">Sauvegardes quotidiennes chiffrées</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Monitoring</h4>
                  <p className="text-sm">Surveillance 24/7 des accès</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-600" />
                7. Vos Droits (RGPD)
              </h2>
              <p className="mb-4">Conformément au RGPD, vous disposez des droits suivants :</p>
              
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Droit d'accès</h4>
                  <p className="text-sm">Obtenir une copie de vos données personnelles</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Droit de rectification</h4>
                  <p className="text-sm">Corriger des données inexactes ou incomplètes</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Droit à l'effacement</h4>
                  <p className="text-sm">Demander la suppression de vos données (sauf obligations légales)</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Droit à la limitation</h4>
                  <p className="text-sm">Limiter le traitement de vos données dans certains cas</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Droit à la portabilité</h4>
                  <p className="text-sm">Récupérer vos données dans un format structuré (CSV, JSON)</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Droit d'opposition</h4>
                  <p className="text-sm">Vous opposer au traitement de vos données (marketing, profilage)</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-6">
                <h4 className="font-semibold mb-2"> Pour exercer vos droits :</h4>
                <p className="text-sm mb-2">
                  Envoyez un email à <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a> avec :
                </p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li>Objet : "Exercice de mes droits RGPD"</li>
                  <li>Votre identité (nom, email utilisé sur LeadSynch)</li>
                  <li>Le droit que vous souhaitez exercer</li>
                </ul>
                <p className="text-sm mt-2">
                   <strong>Délai de réponse :</strong> 1 mois maximum (prorogeable de 2 mois si complexité)
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies</h2>
              <p className="mb-4">LeadSynch utilise des cookies pour améliorer votre expérience :</p>
              
              <h3 className="text-lg font-semibold mb-2">Types de cookies :</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement (authentification, préférences)</li>
                <li><strong>Cookies analytiques :</strong> Google Analytics pour mesurer l'audience (anonymisés)</li>
                <li><strong>Cookies fonctionnels :</strong> Mémorisation de vos préférences</li>
              </ul>
              
              <p className="text-sm bg-gray-50 p-4 rounded-lg">
                 <strong>Gestion des cookies :</strong> Vous pouvez refuser ou supprimer les cookies via les paramètres de votre navigateur. 
                Attention, certains cookies sont indispensables au bon fonctionnement de LeadSynch.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Transferts Internationaux</h2>
              <p className="mb-3">
                Vos données sont hébergées en France (OVH). Certains prestataires peuvent effectuer des transferts hors UE :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Anthropic (Claude AI) :</strong> USA - Clauses contractuelles types UE approuvées</li>
                <li><strong>Stripe (paiements) :</strong> USA - Certifié Privacy Shield</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                Ces transferts sont encadrés par des garanties appropriées conformément au RGPD.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Mineurs</h2>
              <p>
                LeadSynch est un service B2B réservé aux professionnels. Nous ne collectons pas sciemment de données de personnes 
                de moins de 18 ans. Si vous pensez qu'un mineur a créé un compte, contactez-nous immédiatement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Modifications de la Politique</h2>
              <p>
                Nous pouvons modifier cette Politique de Confidentialité pour refléter les évolutions de nos pratiques ou de la législation. 
                Les utilisateurs seront informés par email de toute modification substantielle. La version actualisée sera toujours 
                disponible sur cette page avec la date de mise à jour.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Réclamation auprès de la CNIL</h2>
              <p className="mb-3">
                Si vous estimez que vos droits ne sont pas respectés, vous avez le droit d'introduire une réclamation auprès de la CNIL :
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="mb-2"><strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong></p>
                <p className="mb-2">3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07</p>
                <p className="mb-2">Téléphone : 01 53 73 22 22</p>
                <p>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.cnil.fr</a></p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact</h2>
              <p className="mb-3">
                Pour toute question concernant cette Politique de Confidentialité ou vos données personnelles :
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <h3 className="font-semibold mb-3"> Contact DPO et Support</h3>
                <p className="mb-2">
                  <strong>Email :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a>
                </p>
                <p className="mb-2"><strong>Téléphone :</strong> 09 78 25 07 46</p>
                <p className="mb-2"><strong>Site web :</strong> <a href="https://www.leadsynch.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.leadsynch.com</a></p>
                <p><strong>Horaires :</strong> Du lundi au vendredi, 9h-18h</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Siège Social</h4>
                  <p className="text-sm">
                    TrusTech IT Support<br />
                    74B Boulevard Henri Dunant<br />
                    91100 Corbeil-Essonnes<br />
                    France
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Centre de Service</h4>
                  <p className="text-sm">
                    <strong>Réclamations, demandes d'information :</strong><br />
                    505 Place des Champs Élysées<br />
                    91080 Évry-Courcouronnes<br />
                    France
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              to="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
               Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
