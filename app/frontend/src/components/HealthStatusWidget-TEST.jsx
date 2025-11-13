import React from 'react';

export default function HealthStatusWidget() {
  return (
    <div style={{
      border: '4px solid red',
      padding: '20px',
      backgroundColor: 'yellow',
      marginBottom: '20px'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'red' }}>
        🔥 WIDGET ÉTAT DE SANTÉ - VERSION TEST 🔥
      </h2>
      <p style={{ fontSize: '16px', marginTop: '10px' }}>
        Si vous voyez ce texte avec bordure ROUGE et fond JAUNE,
        c'est que le widget fonctionne !
      </p>
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'white', border: '2px solid black' }}>
        <p>✅ Email configuré : NON</p>
        <p>✅ Première campagne : NON</p>
        <p>📊 Quotas : 0/100 emails</p>
      </div>
    </div>
  );
}
