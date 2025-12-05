import { log, error, warn } from "../lib/logger.js";
﻿import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Validation critique : JWT_SECRET DOIT être définie
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  error('❌ ERREUR CRITIQUE : JWT_SECRET non configurée dans les variables d\'environnement');
  error('Le serveur ne peut pas démarrer sans JWT_SECRET pour sécuriser les tokens');
  process.exit(1); // Arrêt immédiat du serveur
}

if (JWT_SECRET.length < 32) {
  warn('⚠️ ATTENTION : JWT_SECRET trop courte (minimum 32 caractères recommandé)');
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export function generateToken(userId, tenantId, role, is_super_admin = false) {
  return jwt.sign(
    { id: userId, tenant_id: tenantId, role, is_super_admin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
