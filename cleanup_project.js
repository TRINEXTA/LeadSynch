/**
 * Script de nettoyage post-audit pour LeadSynch
 * Usage: node cleanup_project.js
 *
 * Ce script supprime les fichiers orphelins, sensibles ou temporaires
 * et réorganise certains fichiers de migration/scripts.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

console.log('🧹 Démarrage du nettoyage du projet LeadSynch...\n');

// 1. Liste des fichiers à supprimer (Orphelins, sensibles ou temporaires)
const filesToDelete = [
  // 🔴 SÉCURITÉ - Fichiers sensibles ne devant pas être commités
  'app/frontend/.env.production',

  // Doublons de configuration
  'app/frontend/postcss.config.cjs',

  // Fichiers de structure temporaires
  'backend-structure.txt',
  'structure.txt',
  'structure_projet.txt',

  // Fichiers orphelins (existent ailleurs dans le projet)
  'LeadSynch/lib/errors.js',
  'LeadSynch/middleware/errorHandler.js',

  // Fichiers de log/debug temporaires
  'debug.log',
  'npm-debug.log',
  'yarn-error.log'
];

// 2. Déplacements de fichiers (Organisation)
const filesToMove = [
  // Scripts à déplacer dans app/backend/scripts/
  { src: 'apply-fix-all-columns.js', dest: 'app/backend/scripts/apply-fix-all-columns.js' },
  { src: 'apply-migration.js', dest: 'app/backend/scripts/apply-migration.js' },
  { src: 'fix-constraints.js', dest: 'app/backend/scripts/fix-constraints.js' },

  // Migrations SQL à déplacer dans app/backend/migrations/
  { src: 'fix-all-columns.sql', dest: 'app/backend/migrations/fix-all-columns.sql' },
  { src: 'fix-constraints.sql', dest: 'app/backend/migrations/fix-constraints.sql' }
];

// 3. Dossiers à créer si nécessaire
const dirsToCreate = [
  'app/backend/scripts',
  'app/backend/migrations'
];

// Compteurs
let deleted = 0;
let moved = 0;
let skipped = 0;

// Créer les dossiers nécessaires
dirsToCreate.forEach(dir => {
  const dirPath = path.join(rootDir, dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Dossier créé : ${dir}`);
    } catch (e) {
      console.error(`❌ Erreur création dossier ${dir}:`, e.message);
    }
  }
});

console.log('\n--- Suppression des fichiers obsolètes ---\n');

// Exécution Suppressions
filesToDelete.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`✅ Supprimé : ${file}`);
      deleted++;
    } catch (e) {
      console.error(`❌ Erreur suppression ${file}:`, e.message);
    }
  } else {
    console.log(`ℹ️  Déjà absent : ${file}`);
    skipped++;
  }
});

console.log('\n--- Déplacement des fichiers ---\n');

// Exécution Déplacements
filesToMove.forEach(({ src, dest }) => {
  const srcPath = path.join(rootDir, src);
  const destPath = path.join(rootDir, dest);
  const destDir = path.dirname(destPath);

  if (fs.existsSync(srcPath)) {
    try {
      // Créer le dossier de destination si nécessaire
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Vérifier si le fichier de destination existe déjà
      if (fs.existsSync(destPath)) {
        console.log(`⚠️  Destination existe déjà, ignoré : ${src} -> ${dest}`);
        skipped++;
      } else {
        fs.renameSync(srcPath, destPath);
        console.log(`✅ Déplacé : ${src} -> ${dest}`);
        moved++;
      }
    } catch (e) {
      console.error(`❌ Erreur déplacement ${src}:`, e.message);
    }
  } else {
    console.log(`ℹ️  Fichier source absent : ${src}`);
    skipped++;
  }
});

console.log('\n--- Résumé ---\n');
console.log(`✅ Fichiers supprimés : ${deleted}`);
console.log(`✅ Fichiers déplacés  : ${moved}`);
console.log(`ℹ️  Fichiers ignorés   : ${skipped}`);
console.log('\n✨ Nettoyage terminé !');
console.log('\n💡 N\'oubliez pas de vérifier le .gitignore pour éviter de recommitter ces fichiers.');
