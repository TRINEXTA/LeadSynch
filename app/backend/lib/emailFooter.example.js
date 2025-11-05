import { addUnsubscribeFooter, addUnsubscribeFooterText } from './emailFooter.js';

// Exemple 1 : Email HTML
const htmlEmail = `
<html>
<body>
  <h1>Bonjour {{name}},</h1>
  <p>Voici notre newsletter...</p>
</body>
</html>
`;

const leadId = '10fa4c7b-1f65-4c7a-8486-5022fde71177';
const companyInfo = {
  company_name: 'Mon Entreprise SAS',
  company_address: '123 Avenue des Champs-Élysées, 75008 Paris, France'
};

const emailWithFooter = addUnsubscribeFooter(htmlEmail, leadId, companyInfo);
console.log(emailWithFooter);

// Exemple 2 : Email texte
const textEmail = "Bonjour,\n\nVoici notre newsletter...";
const textWithFooter = addUnsubscribeFooterText(textEmail, leadId, companyInfo);
console.log(textWithFooter);
