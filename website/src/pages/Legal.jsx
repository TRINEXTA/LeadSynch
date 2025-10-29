import React from 'react';
import { Link } from 'react-router-dom';

export default function Legal() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Mentions Légales
          </h1>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <p className="text-sm text-gray-500 mb-4">
                Date de dernière mise à jour : Avril 2025
              </p>
              <p>
                Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance en l'économie numérique, 
                il est précisé aux utilisateurs du site LeadSynch l'identité des différents intervenants dans le cadre de sa 
                réalisation et de son suivi.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Éditeur du Site</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="mb-2">
                  <strong>Raison sociale :</strong> TrusTech IT Support
                </p>
                <p className="mb-2">
                  <strong>Forme juridique :</strong> Société par actions simplifiée (SAS)
                </p>
                <p className="mb-2">
                  <strong>Marque commerciale :</strong> TRINEXTA
                </p>
                <p className="mb-2">
                  <strong>Capital social :</strong> 300 €
                </p>
                <p className="mb-2">
                  <strong>SIRET :</strong> 94202008200015
                </p>
                <p className="mb-2">
                  <strong>Code NAF-APE :</strong> 6202A (Conseil en systèmes et logiciels informatiques)
                </p>
                <p className="mb-2">
                  <strong>Numéro TVA intracommunautaire :</strong> FR81942020082
                </p>
                <p className="mb-2">
                  <strong>RCS :</strong> Évry
                </p>
                <p className="mb-2">
                  <strong>Siège social :</strong> 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes, France
                </p>
                <p className="mb-2">
                  <strong>Téléphone :</strong> 09 78 25 07 46
                </p>
                <p className="mb-2">
                  <strong>Email :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a>
                </p>
                <p className="mb-2">
                  <strong>Site web LeadSynch :</strong> <a href="https://www.leadsynch.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.leadsynch.com</a>
                </p>
                <p>
                  <strong>Site web TRINEXTA :</strong> <a href="https://www.trinexta.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.trinexta.com</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Directeur de la Publication</h2>
              <p>
                <strong>Valoux Prince</strong>, Président de TrusTech IT Support
              </p>
              <p className="mt-2">
                Email : <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Hébergement</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2">
                  Le site LeadSynch est hébergé par :
                </p>
                <p className="mb-2">
                  <strong>OVH SAS</strong>
                </p>
                <p className="mb-2">
                  Siège social : 2 rue Kellermann, 59100 Roubaix, France
                </p>
                <p className="mb-2">
                  Téléphone : 1007
                </p>
                <p className="mb-2">
                  Site web : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.ovhcloud.com</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Délégué à la Protection des Données (DPO)</h2>
              <p>
                Pour toute question relative à la protection de vos données personnelles, vous pouvez contacter notre DPO :
              </p>
              <p className="mt-3">
                <strong>Email :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a>
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Conformément au RGPD (Règlement Général sur la Protection des Données), vous disposez d'un droit d'accès, 
                de rectification, de suppression et d'opposition de vos données personnelles. Pour en savoir plus, consultez 
                notre <Link to="/privacy" className="text-blue-600 hover:underline">Politique de Confidentialité</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Propriété Intellectuelle</h2>
              <p className="mb-3">
                L'ensemble du contenu du site LeadSynch (structure, textes, logos, images, vidéos, code source, base de données) 
                est la propriété exclusive de TrusTech IT Support, sauf mentions particulières.
              </p>
              <p className="mb-3">
                Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, 
                quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de TrusTech IT Support.
              </p>
              <p>
                Les marques  LeadSynch ,  TRINEXTA  et  Asefi  sont des marques déposées appartenant à TrusTech IT Support. 
                Toute utilisation non autorisée constitue une contrefaçon.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Données Personnelles et Cookies</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">6.1 Collecte de données</h3>
              <p>
                LeadSynch collecte des données personnelles nécessaires au bon fonctionnement du service (nom, prénom, email, 
                SIRET, données d'utilisation). Ces données sont traitées conformément au RGPD.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">6.2 Cookies</h3>
              <p className="mb-3">
                Le site utilise des cookies pour améliorer l'expérience utilisateur et analyser le trafic. Les types de cookies utilisés sont :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site (authentification, panier)</li>
                <li><strong>Cookies analytiques :</strong> Pour analyser l'audience (Google Analytics)</li>
                <li><strong>Cookies fonctionnels :</strong> Pour mémoriser vos préférences</li>
              </ul>
              <p className="mt-3">
                Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">6.3 Pour en savoir plus</h3>
              <p>
                Consultez notre <Link to="/privacy" className="text-blue-600 hover:underline">Politique de Confidentialité</Link> pour 
                plus d'informations sur le traitement de vos données.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Liens Hypertextes</h2>
              <p className="mb-3">
                Le site LeadSynch peut contenir des liens hypertextes vers d'autres sites internet. TrusTech IT Support n'exerce 
                aucun contrôle sur ces sites tiers et décline toute responsabilité quant à leur contenu.
              </p>
              <p>
                Tout site internet peut créer un lien vers LeadSynch sans autorisation préalable, à condition que ce lien 
                s'ouvre dans une nouvelle fenêtre et ne donne pas une image dégradée ou mensongère de nos services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation de Responsabilité</h2>
              <p className="mb-3">
                TrusTech IT Support met tout en œuvre pour offrir aux utilisateurs des informations et outils disponibles et vérifiés, 
                mais ne saurait être tenu responsable des erreurs, d'une absence de disponibilité des informations et/ou de la présence 
                de virus sur son site.
              </p>
              <p className="mb-3">
                Les informations fournies par LeadSynch le sont à titre indicatif. L'utilisateur reste seul responsable de l'utilisation 
                qu'il en fait.
              </p>
              <p>
                TrusTech IT Support ne saurait être tenu responsable de dommages directs ou indirects résultant de l'utilisation du site 
                ou de l'impossibilité d'y accéder.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Droit Applicable</h2>
              <p>
                Les présentes mentions légales sont régies par le droit français. En cas de litige, et après recherche d'une solution 
                amiable, les tribunaux français seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Crédits</h2>
              <p className="mb-3">
                <strong>Conception et développement :</strong> TrusTech IT Support
              </p>
              <p className="mb-3">
                <strong>Intelligence Artificielle :</strong> Asefi, propulsé par Claude (Anthropic)
              </p>
              <p className="mb-3">
                <strong>Icônes :</strong> Lucide Icons
              </p>
              <p>
                <strong>Technologies :</strong> React, Node.js, PostgreSQL
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact</h2>
              <p className="mb-3">
                Pour toute question concernant les mentions légales ou le site LeadSynch :
              </p>
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <p className="mb-2">
                  <strong>Email :</strong> <a href="mailto:contact@leadsynch.com" className="text-blue-600 hover:underline">contact@leadsynch.com</a>
                </p>
                <p className="mb-2">
                  <strong>Téléphone :</strong> 09 78 25 07 46
                </p>
                <p className="mb-2">
                  <strong>Horaires :</strong> Du lundi au vendredi, 9h-18h
                </p>
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
                    <strong>Réclamations, demandes d'information :</strong><br />
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
