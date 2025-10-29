import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Conditions Générales d'Utilisation (CGU)
          </h1>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <p className="text-sm text-gray-500 mb-4">
                Date de dernière mise à jour : Avril 2025
              </p>
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après  CGU ) régissent l'utilisation de la plateforme LeadSynch 
                accessible à l'adresse www.leadsynch.com, éditée par TrusTech IT Support, société par actions simplifiée (SAS) au capital 
                de 300 €, immatriculée au RCS d'Évry sous le numéro SIRET 94202008200015, dont le siège social est situé au 74B Boulevard 
                Henri Dunant, 91100 Corbeil-Essonnes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Objet</h2>
              <p>
                LeadSynch est une plateforme SaaS (Software as a Service) de gestion de la relation client (CRM) et de prospection B2B, 
                proposant des outils de génération de leads, de campagnes email, d'assistant IA et d'analytics.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Acceptation des CGU</h2>
              <p>
                L'utilisation de LeadSynch implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, 
                veuillez ne pas utiliser la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Inscription et Compte Utilisateur</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.1 Création de compte</h3>
              <p className="mb-3">
                Pour utiliser LeadSynch, vous devez créer un compte en fournissant des informations exactes et à jour, notamment :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nom, prénom et email professionnel</li>
                <li>Numéro de SIRET de votre entreprise (obligatoire)</li>
                <li>Coordonnées téléphoniques</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.2 Sécurité du compte</h3>
              <p>
                Vous êtes responsable de la confidentialité de vos identifiants de connexion. Toute utilisation de votre compte est présumée 
                avoir été effectuée par vous. En cas d'utilisation non autorisée, vous devez immédiatement nous en informer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Plans et Abonnements</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.1 Plans disponibles</h3>
              <p className="mb-3">LeadSynch propose 4 plans :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>FREE :</strong> 0€/mois - 60 leads (10 générés + 50 importés), 100 emails/mois</li>
                <li><strong>BASIC :</strong> 49€/mois - 1000 leads, 5000 emails/mois, 3 utilisateurs</li>
                <li><strong>PRO :</strong> 99€/mois - 10k leads, 50k emails/mois, 10 utilisateurs</li>
                <li><strong>ENTERPRISE :</strong> Sur mesure - Tout illimité</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.2 Sans engagement</h3>
              <p>
                Tous les abonnements sont sans engagement. Vous pouvez résilier à tout moment depuis votre compte. 
                Les mois déjà payés ne sont pas remboursables, sauf en cas de bug ou de problème technique imputable à LeadSynch.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.3 Facturation</h3>
              <p>
                Les abonnements mensuels sont facturés le même jour chaque mois. Les abonnements annuels sont facturés en une seule fois 
                avec une réduction de 20%. La facturation est automatique via les moyens de paiement enregistrés.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Utilisation de l'Assistant IA Asefi</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.1 Nature du service</h3>
              <p>
                LeadSynch intègre Asefi, un assistant d'intelligence artificielle qui génère du contenu (emails, messages, suggestions). 
                Ce contenu est généré automatiquement par des algorithmes d'IA.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.2 Responsabilité de l'utilisateur</h3>
              <p className="mb-3">
                <strong className="text-red-600">AVERTISSEMENT IMPORTANT :</strong> Le contenu généré par l'IA peut contenir des inexactitudes, 
                des erreurs ou des informations inappropriées. L'utilisateur est seul responsable de :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Vérifier l'exactitude et la pertinence du contenu généré</li>
                <li>Relire et valider tout message avant envoi</li>
                <li>S'assurer de la conformité du contenu avec les lois applicables</li>
                <li>L'usage final du contenu généré par l'IA</li>
              </ul>
              <p className="mt-3">
                TrusTech IT Support décline toute responsabilité concernant le contenu généré par l'IA et ses conséquences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Utilisation des Données Importées</h2>
              <p className="mb-3">
                <strong className="text-blue-600">IMPORTANT :</strong> Les bases de données de leads que vous importez dans LeadSynch 
                sont conservées en interne par TrusTech IT Support afin d'enrichir notre base de données globale et d'améliorer nos 
                algorithmes de recherche, d'enrichissement de leads et de qualification.
              </p>
              <p className="mb-3">
                En important des données dans LeadSynch, vous acceptez expressément que ces données soient utilisées pour :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Améliorer la qualité des données d'enrichissement</li>
                <li>Entraîner et optimiser nos algorithmes de matching</li>
                <li>Développer de nouvelles fonctionnalités</li>
                <li>Enrichir notre base de données B2B</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                Ces données restent confidentielles et ne sont jamais revendues à des tiers. Elles sont uniquement utilisées pour 
                améliorer le service LeadSynch.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Obligations de l'Utilisateur</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">7.1 Utilisation conforme</h3>
              <p className="mb-3">Vous vous engagez à utiliser LeadSynch de manière conforme à :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>La législation française et européenne en vigueur</li>
                <li>Le Règlement Général sur la Protection des Données (RGPD)</li>
                <li>Les règles de prospection commerciale (B2B uniquement)</li>
                <li>Les présentes CGU</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">7.2 Contenus interdits</h3>
              <p className="mb-3">
                <strong className="text-red-600">Il est strictement interdit d'utiliser LeadSynch pour :</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Promouvoir ou vendre des drogues, substances illicites ou réglementées</li>
                <li>Diffuser des contenus à caractère pornographique, pédophile ou violent</li>
                <li>Effectuer du spam, du phishing ou toute activité frauduleuse</li>
                <li>Promouvoir des activités illégales ou pénalement répréhensibles</li>
                <li>Collecter des données personnelles sans consentement</li>
                <li>Harceler, menacer ou discriminer des personnes</li>
                <li>Violer les droits de propriété intellectuelle</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">7.3 Sanctions</h3>
              <p>
                En cas de non-respect de ces obligations, TrusTech IT Support se réserve le droit de suspendre ou résilier immédiatement 
                votre compte, sans préavis ni remboursement, et de prendre toute mesure légale appropriée.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Propriété Intellectuelle</h2>
              <p>
                LeadSynch, son code source, sa base de données, son design et tous les contenus sont la propriété exclusive de 
                TrusTech IT Support. Toute reproduction, représentation, modification ou exploitation sans autorisation est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Protection des Données</h2>
              <p>
                Le traitement de vos données personnelles est décrit dans notre{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">Politique de Confidentialité</Link>. 
                Nous nous engageons à respecter le RGPD et à protéger vos données.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Résiliation</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">10.1 Par l'utilisateur</h3>
              <p>
                Vous pouvez résilier votre abonnement à tout moment depuis votre compte. La résiliation prendra effet à la fin de la 
                période de facturation en cours. Aucun remboursement ne sera effectué pour la période déjà payée.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">10.2 Par LeadSynch</h3>
              <p>
                Nous nous réservons le droit de résilier votre compte en cas de violation des CGU, d'impayé ou de non-respect 
                de la législation en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation de Responsabilité</h2>
              <p className="mb-3">
                TrusTech IT Support ne saurait être tenu responsable de :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>L'exactitude, la qualité ou la pertinence des contenus générés par l'IA</li>
                <li>Les dommages indirects résultant de l'utilisation de LeadSynch</li>
                <li>Les interruptions de service dues à des causes externes (panne internet, maintenance, etc.)</li>
                <li>Les pertes de données dues à une faute de l'utilisateur</li>
                <li>Les conséquences de l'utilisation frauduleuse ou abusive de la plateforme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Modifications des CGU</h2>
              <p>
                TrusTech IT Support se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés 
                par email de toute modification substantielle. L'utilisation continue de LeadSynch après modification vaut acceptation 
                des nouvelles CGU.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Loi Applicable et Juridiction</h2>
              <p>
                Les présentes CGU sont régies par le droit français. En cas de litige, et après tentative de résolution amiable, 
                les tribunaux français seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact</h2>
              <p className="mb-3">
                Pour toute question concernant les présentes CGU, vous pouvez nous contacter :
              </p>
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <p className="mb-2">
                  <strong>Email :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a>
                </p>
                <p className="mb-2"><strong>Téléphone :</strong> 09 78 25 07 46</p>
                <p className="mb-2"><strong>Site web :</strong> <a href="https://www.leadsynch.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.leadsynch.com</a></p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Siège Social</h4>
                  <p className="text-sm">
                    TrusTech IT Support<br />
                    74B Boulevard Henri Dunant<br />
                    91100 Corbeil-Essonnes
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2"> Centre de Service</h4>
                  <p className="text-sm">
                    505 Place des Champs Élysées<br />
                    91080 Évry-Courcouronnes
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
