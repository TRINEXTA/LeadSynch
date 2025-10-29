# LeadSych Frontend - Installation

## 📋 Instructions

### 1. Extraire le ZIP
Décompressez le fichier dans : `C:\Projects_LeadSync\LeadSych\app\`

Vous devriez avoir :
```
C:\Projects_LeadSync\LeadSych\app\frontend\
├── src/
├── public/
├── package.json
├── vite.config.js
├── index.html
└── .env
```

### 2. Installer les dépendances
```powershell
cd C:\Projects_LeadSync\LeadSych\app\frontend
npm install
```

### 3. Démarrer
```powershell
npm run dev
```

### 4. Ouvrir dans le navigateur
http://localhost:5173

### 5. Se connecter
- Email: vprince@trinexta.fr
- Mot de passe: Admin123!

## ⚠️ Important
Le backend DOIT tourner sur port 3000 !

## 🐛 En cas de problème
Supprimez `node_modules` et réinstallez :
```powershell
Remove-Item node_modules -Recurse -Force
npm install
```
