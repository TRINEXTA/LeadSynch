import React from 'react';
import { Link } from 'react-router-dom';

export default function Sales() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Conditions Générales de Vente (CGV)
          </h1>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <p className="text-sm text-gray-500 mb-4">
                Date de dernière mise à jour : Avril 2025
              </p>
              <p>
                Les présentes Conditions Générales de Vente (ci-après  CGV ) régissent la vente des abonnements payants de la plateforme 
                LeadSynch accessible à l'adresse www.leadsynch.com, éditée par TrusTech IT Support, SAS au capital de 300 €, immatriculée 
                au RCS d'Évry sous le numéro SIRET 94202008200015, dont le siège social est situé au 74B Boulevard Henri Dunant, 
                91100 Corbeil-Essonnes.
              </p>
              <p className="mt-3">
                <strong>Numéro TVA intracommunautaire :</strong> FR81942020082
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Objet</h2>
              <p>
                Les présentes CGV s'appliquent à toute commande d'abonnement payant (plans BASIC, PRO ou ENTERPRISE) effectuée sur 
                la plateforme LeadSynch accessible à l'adresse www.leadsynch.com
              </p>
              <p className="mt-3">
                Le plan FREE est gratuit et n'est pas soumis aux présentes CGV, mais aux{' '}
                <Link to="/terms" className="text-blue-600 hover:underline">CGU</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Prix</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">2.1 Tarifs</h3>
              <p className="mb-3">Les prix des abonnements sont les suivants (TVA applicable incluse) :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>BASIC :</strong> 49€ HT/mois (58,80€ TTC) ou 39€ HT/mois (46,80€ TTC) en engagement annuel</li>
                <li><strong>PRO :</strong> 99€ HT/mois (118,80€ TTC) ou 79€ HT/mois (94,80€ TTC) en engagement annuel</li>
                <li><strong>ENTERPRISE :</strong> Sur devis personnalisé</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                Prix affichés TTC (TVA à 20%) pour les clients français assujettis. Pour les clients B2B de l'UE avec numéro de TVA valide, 
                la TVA sera inversée.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">2.2 Modification des prix</h3>
              <p>
                TrusTech IT Support se réserve le droit de modifier ses tarifs à tout moment. Les modifications n'affectent pas les 
                abonnements en cours. Les nouveaux tarifs seront communiqués par email 30 jours avant leur application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Commande et Paiement</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.1 Processus de commande</h3>
              <p className="mb-3">Pour souscrire à un abonnement payant :</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Créez un compte sur LeadSynch</li>
                <li>Choisissez votre plan (BASIC, PRO ou ENTERPRISE)</li>
                <li>Renseignez vos informations de facturation (SIRET obligatoire)</li>
                <li>Validez votre commande et effectuez le paiement</li>
              </ol>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.2 Moyens de paiement</h3>
              <p className="mb-3">Les moyens de paiement acceptés sont :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Carte bancaire (Visa, Mastercard, American Express)</li>
                <li>Virement bancaire (pour le plan ENTERPRISE uniquement)</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.3 Sécurité des paiements</h3>
              <p>
                Les paiements sont sécurisés et traités par notre prestataire de paiement certifié PCI-DSS. Aucune donnée bancaire 
                n'est conservée sur nos serveurs.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.4 Facturation</h3>
              <p>
                Une facture est automatiquement générée et envoyée par email à chaque paiement. Les factures sont également disponibles 
                dans votre espace client.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Durée et Renouvellement</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.1 Durée</h3>
              <p className="mb-3">
                Les abonnements sont proposés en deux formules :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mensuel :</strong> Durée d'1 mois, renouvelable automatiquement chaque mois</li>
                <li><strong>Annuel :</strong> Durée de 12 mois, renouvelable automatiquement chaque année avec réduction de 20%</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.2 Renouvellement automatique</h3>
              <p>
                Les abonnements sont tacitement reconduits pour la même durée, sauf résiliation par l'utilisateur avant la date 
                d'échéance. Le paiement est prélevé automatiquement à chaque échéance.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.3 Pas de période d'essai</h3>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="mb-2">
                  <strong className="text-blue-600">ℹ Information importante :</strong> LeadSynch ne propose pas de période d'essai sur les plans payants.
                </p>
                <p>
                  Si vous souhaitez tester notre plateforme avant de souscrire à un abonnement payant, nous vous recommandons d'utiliser 
                  le <strong>plan FREE gratuit</strong> qui vous permet de découvrir les fonctionnalités principales avec 60 leads offerts.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Résiliation et Remboursement</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.1 Résiliation sans engagement</h3>
              <p>
                Tous les abonnements sont sans engagement. Vous pouvez résilier à tout moment depuis votre espace client, rubrique 
                "Abonnement". La résiliation prendra effet à la fin de la période de facturation en cours.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.2 Politique de remboursement</h3>
              <p className="mb-3">
                <strong className="text-red-600">IMPORTANT :</strong> Les abonnements payés ne sont pas remboursables, sauf dans les cas suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Bug majeur empêchant l'utilisation de la plateforme, imputable à LeadSynch</li>
                <li>Problème technique grave non résolu sous 72h</li>
                <li>Erreur de facturation de notre part</li>
                <li>Droit de rétractation (voir article 6)</li>
              </ul>
              <p className="mt-3">
                En cas de résiliation, vous conservez l'accès à votre compte jusqu'à la fin de la période déjà payée.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.3 Impayés</h3>
              <p>
                En cas d'impayé, votre compte sera suspendu après 7 jours. Si le paiement n'est pas régularisé sous 30 jours, 
                votre compte sera définitivement supprimé et vos données effacées.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Droit de Rétractation</h2>
              <p className="mb-3">
                Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de <strong>14 jours</strong> 
                à compter de la souscription de l'abonnement pour exercer votre droit de rétractation, sans avoir à justifier de motifs.
              </p>
              <p className="mb-3">
                <strong>Exception :</strong> Si vous commencez à utiliser les services avant la fin du délai de rétractation, 
                vous renoncez expressément à votre droit de rétractation conformément à l'article L221-28 du Code de la consommation.
              </p>
              <p>
                Pour exercer votre droit de rétractation, envoyez un email à <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a> 
                avec l'objet "Rétractation - LeadSynch".
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Livraison du Service</h2>
              <p>
                L'accès au service est immédiat dès validation du paiement. Vous recevez un email de confirmation avec vos identifiants 
                de connexion (si nouveau compte) ou la confirmation de l'upgrade de votre plan.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Garanties et Responsabilités</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">8.1 Disponibilité du service</h3>
              <p>
                Nous nous efforçons de maintenir une disponibilité du service de 99%. Cependant, des interruptions peuvent survenir 
                pour maintenance, mise à jour ou cas de force majeure.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">8.2 Limitation de responsabilité</h3>
              <p className="mb-3">
                Notre responsabilité est limitée au montant payé par le client au cours des 12 derniers mois. Nous ne sommes pas 
                responsables des dommages indirects (perte de chiffre d'affaires, de données, d'opportunités commerciales).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Données Personnelles</h2>
              <p>
                Le traitement de vos données de facturation et d'utilisation est conforme au RGPD. Pour plus d'informations, 
                consultez notre <Link to="/privacy" className="text-blue-600 hover:underline">Politique de Confidentialité</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Médiation</h2>
              <p>
                En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation : 
              </p>
              <p className="mt-3">
                <strong>Médiateur de la consommation CNPM - MEDIATION DE LA CONSOMMATION</strong><br />
                27 avenue de la Libération, 42400 SAINT-CHAMOND<br />
                Email : <a href="mailto:contact@cnpm-mediation.eu" className="text-blue-600 hover:underline">contact@cnpm-mediation.eu</a><br />
                Site : <a href="https://cnpm-mediation.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://cnpm-mediation.eu</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Loi Applicable</h2>
              <p>
                Les présentes CGV sont régies par le droit français. En cas de litige, après tentative de résolution amiable, 
                les tribunaux français seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact</h2>
              <p className="mb-3">
                Pour toute question concernant les présentes CGV ou votre abonnement :
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
