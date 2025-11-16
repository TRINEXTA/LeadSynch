# 🚀 DÉPLOIEMENT - LeadSynch

## ÉTAPE 1: Appliquer migration SQL sur Neon ⚠️ IMPORTANT

### Via Console Neon (RECOMMANDÉ):

1. Aller sur: https://console.neon.tech
2. Ouvrir projet LeadSynch
3. Cliquer "SQL Editor"
4. Ouvrir le fichier: `app/backend/migrations/create_geographic_sectors.sql`
5. Copier TOUT le contenu
6. Coller dans SQL Editor
7. Cliquer "Run"
8. ✅ Vérifier message succès

---

## ÉTAPE 2: Déployer sur Vercel

```bash
# Backend
cd app/backend
vercel --prod

# Frontend
cd ../frontend
npm run build
vercel --prod
```

---

## 💻 TESTER EN LOCAL (optionnel)

```bash
# Terminal 1 - Backend
cd app/backend
npm run dev

# Terminal 2 - Frontend
cd app/frontend
npm run dev

# Ouvrir: http://localhost:5173
```

---

## ✅ CE QUI A ÉTÉ FAIT

- Dashboard données réelles (plus de fictif)
- Dashboard Manager avec validations
- Secteurs Géographiques complet (Nord/Sud/Est/Ouest)

**4 commits pushés sur GitHub** ✅

