#!/bin/bash
# =====================================================
# Script de déploiement des mises à jour LeadSynch
# Nouvelles fonctionnalités: AI Intelligence, Sequences, WhatsApp
# =====================================================

set -e  # Arrêter si une commande échoue

echo "=========================================="
echo "🚀 Déploiement des mises à jour LeadSynch"
echo "=========================================="

# Configuration - MODIFIEZ CES VARIABLES
PROJECT_DIR="${PROJECT_DIR:-/home/user/LeadSynch}"
POSTGRES_URL="${POSTGRES_URL:-postgresql://user:password@localhost:5432/leadsynch}"
PM2_APP_NAME="${PM2_APP_NAME:-leadsynch-backend}"
BRANCH="${BRANCH:-claude/leadsynch-improvements-VieGc}"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() { echo -e "${GREEN}✅ $1${NC}"; }
echo_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
echo_error() { echo -e "${RED}❌ $1${NC}"; }
echo_info() { echo -e "ℹ️  $1"; }

# Vérifier que nous sommes dans le bon dossier
cd "$PROJECT_DIR" || { echo_error "Dossier $PROJECT_DIR introuvable"; exit 1; }
echo_info "Dossier de travail: $(pwd)"

# ========== ÉTAPE 1: Sauvegarde ==========
echo ""
echo "📦 Étape 1: Sauvegarde de la base de données..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
if pg_dump "$POSTGRES_URL" > "/tmp/$BACKUP_FILE" 2>/dev/null; then
    echo_success "Backup créé: /tmp/$BACKUP_FILE"
else
    echo_warning "Backup échoué (continuez avec précaution)"
fi

# ========== ÉTAPE 2: Récupération du code ==========
echo ""
echo "📥 Étape 2: Récupération du code..."
git fetch origin
if git checkout "$BRANCH" 2>/dev/null; then
    git pull origin "$BRANCH"
    echo_success "Code récupéré depuis $BRANCH"
else
    echo_warning "Branche $BRANCH non trouvée, utilisation de la branche actuelle"
    git pull
fi

# ========== ÉTAPE 3: Installation des dépendances ==========
echo ""
echo "📦 Étape 3: Installation des dépendances..."
cd app/backend
npm install --production
echo_success "Dépendances installées"

# ========== ÉTAPE 4: Migration de la base de données ==========
echo ""
echo "🗄️  Étape 4: Migration de la base de données..."
MIGRATION_FILE="migrations/021_ai_sequences_workflows_whatsapp.sql"

if [ -f "$MIGRATION_FILE" ]; then
    if psql "$POSTGRES_URL" -f "$MIGRATION_FILE" 2>&1; then
        echo_success "Migration exécutée avec succès"
    else
        echo_error "Erreur lors de la migration"
        echo_info "Vérifiez les erreurs ci-dessus et corrigez-les manuellement"
        read -p "Continuer quand même? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo_warning "Fichier de migration non trouvé: $MIGRATION_FILE"
fi

# ========== ÉTAPE 5: Redémarrage du serveur ==========
echo ""
echo "🔄 Étape 5: Redémarrage du serveur..."

# Vérifier si PM2 est utilisé
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        pm2 restart "$PM2_APP_NAME"
        echo_success "Serveur redémarré via PM2"
    else
        echo_warning "Application PM2 '$PM2_APP_NAME' non trouvée"
        echo_info "Démarrage manuel: pm2 start server.js --name $PM2_APP_NAME"
    fi
# Vérifier si systemd est utilisé
elif systemctl is-active --quiet leadsynch 2>/dev/null; then
    sudo systemctl restart leadsynch
    echo_success "Serveur redémarré via systemd"
else
    echo_warning "Aucun gestionnaire de processus détecté"
    echo_info "Redémarrez manuellement: node server.js"
fi

# ========== ÉTAPE 6: Vérification ==========
echo ""
echo "🔍 Étape 6: Vérification du déploiement..."
sleep 3  # Attendre que le serveur démarre

# Tester l'endpoint health
if curl -s http://localhost:3000/api/health | grep -q '"ok":true'; then
    echo_success "API Health: OK"
else
    echo_error "API Health: ERREUR"
fi

# ========== RÉSUMÉ ==========
echo ""
echo "=========================================="
echo "📋 RÉSUMÉ DU DÉPLOIEMENT"
echo "=========================================="
echo ""
echo "Nouveaux endpoints disponibles:"
echo "  • GET  /api/lead-intelligence/health-labels/stats"
echo "  • GET  /api/lead-intelligence/health-labels/:label"
echo "  • POST /api/lead-intelligence/health-labels/refresh"
echo "  • GET  /api/lead-intelligence/next-actions"
echo "  • GET  /api/lead-intelligence/duplicates"
echo "  • POST /api/lead-intelligence/duplicates/scan"
echo "  • POST /api/asefi-chat/chat"
echo "  • POST /api/asefi-chat/generate-email"
echo "  • GET  /api/sequences"
echo "  • POST /api/sequences"
echo "  • POST /api/sequences/:id/enroll"
echo "  • GET  /api/whatsapp/config"
echo "  • POST /api/whatsapp/send"
echo ""
echo_success "Déploiement terminé!"
echo ""
echo "⚠️  N'oubliez pas de:"
echo "   1. Configurer les variables d'environnement WhatsApp si nécessaire"
echo "   2. Tester les nouvelles fonctionnalités"
echo "   3. Informer l'équipe des nouvelles fonctionnalités"
echo ""
