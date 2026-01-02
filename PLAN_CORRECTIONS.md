# 🔧 PLAN DE CORRECTIONS LEADSYNCH

> **Créé le** : 30 décembre 2025
> **Durée estimée** : 6-8 semaines
> **Priorité** : Sécurité → Tests → Refactorisation → Performance → Accessibilité

---

## 📋 VUE D'ENSEMBLE

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SÉCURITÉ CRITIQUE          │  Durée: 1 semaine           │
│  PHASE 2: INFRASTRUCTURE TESTS       │  Durée: 1 semaine           │
│  PHASE 3: TESTS CRITIQUES            │  Durée: 2 semaines          │
│  PHASE 4: REFACTORISATION            │  Durée: 2 semaines          │
│  PHASE 5: ACCESSIBILITÉ              │  Durée: 1 semaine           │
│  PHASE 6: PERFORMANCE & MONITORING   │  Durée: 1 semaine           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 PHASE 1 : SÉCURITÉ CRITIQUE (Semaine 1)

### 1.1 Corriger SSL rejectUnauthorized (Priorité: URGENTE)

**Fichiers à modifier (9 fichiers) :**

```
app/backend/lib/db.js
app/backend/run-setup-migration.js
app/backend/run-migration.js
app/backend/run-clean-migration.js
app/backend/run-migrations.js
app/backend/migrate-mailing-settings.js
app/backend/check-super-admin.js
app/backend/activate-super-admin.js
app/backend/fix-migration.js
```

**Correction à appliquer :**
```javascript
// AVANT (vulnérable)
ssl: { rejectUnauthorized: false }

// APRÈS (sécurisé)
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false }
```

**Temps estimé** : 1 heure

---

### 1.2 Migrer tokens vers httpOnly cookies (Priorité: HAUTE)

**Fichiers Backend à modifier :**
```
app/backend/api/auth/login.js      → Retourner cookie au lieu de token JSON
app/backend/api/auth/logout.js     → Supprimer le cookie
app/backend/middleware/auth.js     → Lire token depuis cookie
```

**Fichiers Frontend à modifier :**
```
app/frontend/src/context/AuthContext.jsx  → Supprimer localStorage
app/frontend/src/api/axios.js             → withCredentials: true
```

**Implémentation Backend :**
```javascript
// api/auth/login.js
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
});
res.json({ success: true, user });
```

**Implémentation Frontend :**
```javascript
// api/axios.js
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // Envoie les cookies automatiquement
});

// AuthContext.jsx - Supprimer:
// localStorage.setItem('token', ...)
// localStorage.getItem('token')
```

**Temps estimé** : 4 heures

---

### 1.3 Supprimer les console.log sensibles (Priorité: MOYENNE)

**Fichiers à nettoyer :**
```
app/frontend/src/api/axios.js           → Supprimer console.log API URL
app/frontend/src/hooks/useRealTimePolling.js → Supprimer logs polling
app/backend/lib/auth.js                 → Vérifier les logs
```

**Action :** Remplacer par un logger conditionnel ou supprimer

**Temps estimé** : 30 minutes

---

### 1.4 Audit des dépendances npm (Priorité: MOYENNE)

```bash
# Backend
cd app/backend
npm audit
npm audit fix
npm outdated

# Frontend
cd app/frontend
npm audit
npm audit fix

# Website
cd website
npm audit
npm audit fix
```

**Temps estimé** : 1 heure

---

## 🧪 PHASE 2 : INFRASTRUCTURE TESTS (Semaine 2)

### 2.1 Setup Jest pour Backend

**Installation :**
```bash
cd app/backend
npm install --save-dev jest supertest @types/jest
```

**Créer fichier de config :**
```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'api/**/*.js',
    'lib/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 10000
};
```

**Créer setup de test :**
```javascript
// __tests__/setup.js
import { jest } from '@jest/globals';

// Mock des variables d'environnement
process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars!!';
process.env.NODE_ENV = 'test';
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test';

// Timeout global
jest.setTimeout(10000);
```

**Ajouter script package.json :**
```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--experimental-vm-modules' jest",
    "test:watch": "NODE_OPTIONS='--experimental-vm-modules' jest --watch",
    "test:coverage": "NODE_OPTIONS='--experimental-vm-modules' jest --coverage"
  }
}
```

**Temps estimé** : 2 heures

---

### 2.2 Setup Vitest pour Frontend

**Installation :**
```bash
cd app/frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Config Vitest :**
```javascript
// vite.config.js - Ajouter
export default defineConfig({
  // ... config existante
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/__tests__/']
    }
  }
});
```

**Créer setup de test :**
```javascript
// src/__tests__/setup.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;
```

**Ajouter scripts :**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Temps estimé** : 2 heures

---

### 2.3 Setup Vitest pour Website

**Installation :**
```bash
cd website
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Config similaire au frontend**

**Temps estimé** : 1 heure

---

## ✅ PHASE 3 : TESTS CRITIQUES (Semaines 3-4)

### 3.1 Tests Backend - Authentification

```javascript
// __tests__/api/auth.test.js
import request from 'supertest';
import app from '../../server.js';

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user with valid token', async () => {
      // ... test avec token valide
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
```

**Tests à créer :**
- [ ] auth/login.test.js
- [ ] auth/logout.test.js
- [ ] auth/me.test.js
- [ ] auth/change-password.test.js
- [ ] auth/reset-password.test.js

**Temps estimé** : 4 heures

---

### 3.2 Tests Backend - Leads CRUD

```javascript
// __tests__/api/leads.test.js
describe('Leads API', () => {
  describe('GET /api/leads', () => {
    it('should return leads for tenant', async () => {
      // Test multi-tenancy
    });

    it('should not return other tenant leads', async () => {
      // Test isolation tenant
    });

    it('should paginate results', async () => {
      // Test pagination
    });
  });

  describe('POST /api/leads', () => {
    it('should create lead with valid data', async () => {});
    it('should validate required fields', async () => {});
    it('should assign tenant_id automatically', async () => {});
  });

  describe('PUT /api/leads/:id', () => {
    it('should update own lead', async () => {});
    it('should not update other tenant lead', async () => {});
  });

  describe('DELETE /api/leads/:id', () => {
    it('should delete own lead', async () => {});
    it('should not delete other tenant lead', async () => {});
  });
});
```

**Tests à créer :**
- [ ] leads.test.js
- [ ] lead-databases.test.js
- [ ] lead-contacts.test.js

**Temps estimé** : 6 heures

---

### 3.3 Tests Backend - Campaigns

```javascript
// __tests__/api/campaigns.test.js
describe('Campaigns API', () => {
  describe('POST /api/campaigns', () => {
    it('should create email campaign', async () => {});
    it('should create phone campaign', async () => {});
    it('should validate campaign type', async () => {});
  });

  describe('POST /api/campaigns/:id/start', () => {
    it('should start campaign', async () => {});
    it('should not start already running campaign', async () => {});
  });

  describe('POST /api/campaigns/:id/pause', () => {
    it('should pause running campaign', async () => {});
  });
});
```

**Tests à créer :**
- [ ] campaigns.test.js
- [ ] campaigns-stats.test.js

**Temps estimé** : 4 heures

---

### 3.4 Tests Frontend - Composants UI

```javascript
// src/__tests__/components/ui/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByText('Delete')).toHaveClass('bg-red-500');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

**Tests à créer :**
- [ ] Button.test.jsx
- [ ] Card.test.jsx
- [ ] Input.test.jsx
- [ ] Select.test.jsx

**Temps estimé** : 3 heures

---

### 3.5 Tests Frontend - AuthContext

```javascript
// src/__tests__/context/AuthContext.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const TestComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
      <span data-testid="user-email">{user?.email}</span>
    </div>
  );
};

describe('AuthContext', () => {
  it('provides authentication state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
  });

  it('updates state after login', async () => {
    // Mock API call
    // Test login flow
  });
});
```

**Temps estimé** : 3 heures

---

### 3.6 Tests Frontend - Pages Principales

```javascript
// src/__tests__/pages/Login.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '@/pages/Login';

describe('Login Page', () => {
  it('renders login form', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows error for invalid email', async () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: /connexion/i }));
    await waitFor(() => {
      expect(screen.getByText(/email invalide/i)).toBeInTheDocument();
    });
  });
});
```

**Tests à créer :**
- [ ] Login.test.jsx
- [ ] Dashboard.test.jsx
- [ ] Leads.test.jsx (basique)

**Temps estimé** : 4 heures

---

## 🔨 PHASE 4 : REFACTORISATION (Semaines 5-6)

### 4.1 Refactoriser CampaignsManager.jsx (1251 → ~5 fichiers)

**Structure cible :**
```
src/pages/CampaignsManager/
├── index.jsx                    (100 lignes) - Orchestrateur
├── CampaignWizardStep1.jsx      (200 lignes) - Sélection type
├── CampaignWizardStep2.jsx      (200 lignes) - Sélection bases
├── CampaignWizardStep3.jsx      (200 lignes) - Configuration
├── CampaignWizardStep4.jsx      (200 lignes) - Templates
├── CampaignWizardStep5.jsx      (150 lignes) - Preview
└── hooks/
    └── useCampaignForm.js       (200 lignes) - Logique formulaire
```

**Étapes :**
1. Créer le dossier CampaignsManager/
2. Extraire le hook useCampaignForm avec toute la logique d'état
3. Créer chaque composant Step séparément
4. Créer l'index.jsx qui orchestre les steps
5. Mettre à jour App.jsx avec le nouveau chemin

**Temps estimé** : 6 heures

---

### 4.2 Refactoriser Planning.jsx (1212 → ~4 fichiers)

**Structure cible :**
```
src/pages/Planning/
├── index.jsx                    (80 lignes)
├── CalendarView.jsx             (300 lignes)
├── EventModal.jsx               (200 lignes)
├── EventList.jsx                (150 lignes)
└── hooks/
    └── usePlanning.js           (250 lignes)
```

**Temps estimé** : 5 heures

---

### 4.3 Refactoriser DashboardManager.jsx (1198 → ~5 fichiers)

**Structure cible :**
```
src/pages/DashboardManager/
├── index.jsx                    (60 lignes)
├── KPICards.jsx                 (150 lignes)
├── ChartsSection.jsx            (200 lignes)
├── RecentActivity.jsx           (150 lignes)
├── QuickActions.jsx             (100 lignes)
└── hooks/
    └── useDashboardData.js      (200 lignes)
```

**Temps estimé** : 5 heures

---

### 4.4 Refactoriser LeadDetailsModal.jsx (586 → ~8 fichiers)

**Structure cible :**
```
src/components/LeadDetails/
├── LeadDetailsModal.jsx         (80 lignes) - Container
├── tabs/
│   ├── InfoTab.jsx              (100 lignes)
│   ├── ContactsTab.jsx          (80 lignes)
│   ├── PhonesTab.jsx            (60 lignes)
│   ├── OfficesTab.jsx           (60 lignes)
│   ├── NotesTab.jsx             (80 lignes)
│   ├── HistoryTab.jsx           (60 lignes)
│   └── EmailsTab.jsx            (60 lignes)
└── hooks/
    └── useLeadDetails.js        (150 lignes)
```

**Temps estimé** : 4 heures

---

### 4.5 Extraire Hooks Réutilisables

**Créer src/hooks/ avec :**

```javascript
// hooks/usePagination.js
export function usePagination(initialLimit = 50) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const nextPage = () => setPage(p => p + 1);
  const prevPage = () => setPage(p => Math.max(1, p - 1));
  const goToPage = (p) => setPage(p);
  const setTotalItems = (t) => setTotal(t);

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page, limit, total, totalPages,
    hasNext, hasPrev,
    nextPage, prevPage, goToPage,
    setLimit, setTotalItems
  };
}
```

```javascript
// hooks/useAsync.js
export function useAsync(asyncFn, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setError(null);
    try {
      const result = await asyncFn(...args);
      setData(result);
      setStatus('success');
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { execute, status, data, error, isLoading: status === 'pending' };
}
```

```javascript
// hooks/useModal.js
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => setIsOpen(s => !s), []);

  return { isOpen, data, open, close, toggle };
}
```

```javascript
// hooks/useTabs.js
export function useTabs(defaultTab = 0) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const isActive = (index) => activeTab === index;
  const switchTo = (index) => setActiveTab(index);

  return { activeTab, isActive, switchTo };
}
```

**Fichiers à créer :**
- [ ] src/hooks/usePagination.js
- [ ] src/hooks/useAsync.js
- [ ] src/hooks/useModal.js
- [ ] src/hooks/useTabs.js
- [ ] src/hooks/useDebounce.js
- [ ] src/hooks/index.js (barrel export)

**Temps estimé** : 3 heures

---

### 4.6 Supprimer Code Mort

**Fichiers à supprimer :**
```bash
rm app/frontend/src/pages/GenerateLeads.jsx.old
```

**Pages stub à implémenter ou supprimer :**
- [ ] MyLeads.jsx → Implémenter ou rediriger vers Leads.jsx
- [ ] TestTracking.jsx → Supprimer (test seulement)
- [ ] CreateLeadSearch.jsx → Implémenter ou supprimer
- [ ] EmailCampaigns.jsx → Rediriger vers Campaigns.jsx
- [ ] GoogleApiSetup.jsx → Implémenter ou supprimer

**Temps estimé** : 2 heures

---

## ♿ PHASE 5 : ACCESSIBILITÉ (Semaine 7)

### 5.1 Ajouter ESLint Plugin Accessibilité

```bash
cd app/frontend
npm install --save-dev eslint-plugin-jsx-a11y

cd website
npm install --save-dev eslint-plugin-jsx-a11y
```

**Configurer .eslintrc.json :**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/no-static-element-interactions": "error"
  }
}
```

**Temps estimé** : 1 heure

---

### 5.2 Corriger Composants UI

**Exemple Button :**
```javascript
// AVANT
<button onClick={onClick}>{children}</button>

// APRÈS
<button
  onClick={onClick}
  type={type || 'button'}
  aria-label={ariaLabel}
  aria-disabled={disabled}
  {...props}
>
  {children}
</button>
```

**Exemple IconButton :**
```javascript
// AVANT
<button onClick={onDelete}><Trash2 /></button>

// APRÈS
<button
  onClick={onDelete}
  aria-label="Supprimer cet élément"
  title="Supprimer"
>
  <Trash2 aria-hidden="true" />
</button>
```

**Composants à corriger :**
- [ ] button.jsx
- [ ] input.jsx
- [ ] select.jsx
- [ ] Header.jsx (menu hamburger)
- [ ] Sidebar.jsx (navigation)
- [ ] Tous les modals

**Temps estimé** : 4 heures

---

### 5.3 Corriger Navigation Clavier

**Modals - Fermeture ESC :**
```javascript
useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [onClose]);
```

**Focus trap dans modals :**
```bash
npm install focus-trap-react
```

```javascript
import FocusTrap from 'focus-trap-react';

<FocusTrap active={isOpen}>
  <div className="modal">
    {/* content */}
  </div>
</FocusTrap>
```

**Temps estimé** : 3 heures

---

### 5.4 Corriger Website

**Header.jsx - Menu hamburger :**
```javascript
// AVANT
<button onClick={() => setIsMenuOpen(!isMenuOpen)}>
  {isMenuOpen ? <X /> : <Menu />}
</button>

// APRÈS
<button
  onClick={() => setIsMenuOpen(!isMenuOpen)}
  aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
  aria-expanded={isMenuOpen}
  aria-controls="mobile-menu"
>
  {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
</button>

<nav id="mobile-menu" aria-hidden={!isMenuOpen}>
  {/* menu items */}
</nav>
```

**Ajouter animation slideDown manquante :**
```javascript
// tailwind.config.js
animation: {
  gradient: 'gradient 8s ease infinite',
  slideDown: 'slideDown 0.3s ease-out',
},
keyframes: {
  // ... existing
  slideDown: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
}
```

**Temps estimé** : 2 heures

---

## ⚡ PHASE 6 : PERFORMANCE & MONITORING (Semaine 8)

### 6.1 Virtualisation des Listes

**Installation :**
```bash
cd app/frontend
npm install react-window
```

**Exemple Leads.jsx :**
```javascript
import { FixedSizeList } from 'react-window';

const LeadsList = ({ leads }) => (
  <FixedSizeList
    height={600}
    width="100%"
    itemCount={leads.length}
    itemSize={72}
  >
    {({ index, style }) => (
      <div style={style}>
        <LeadRow lead={leads[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

**Pages à virtualiser :**
- [ ] Leads.jsx
- [ ] Campaigns.jsx
- [ ] Users.jsx
- [ ] Pipeline.jsx (listes longues)

**Temps estimé** : 4 heures

---

### 6.2 Ajouter React.memo

**Composants à memoizer :**
```javascript
// Composants de liste
export const LeadRow = React.memo(({ lead, onSelect, onEdit }) => {
  return (
    <tr onClick={() => onSelect(lead.id)}>
      <td>{lead.company_name}</td>
      {/* ... */}
    </tr>
  );
});

// Comparaison personnalisée si nécessaire
export const LeadRow = React.memo(({ lead, onSelect }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.lead.id === nextProps.lead.id
      && prevProps.lead.updated_at === nextProps.lead.updated_at;
});
```

**Temps estimé** : 2 heures

---

### 6.3 Ajouter Sentry (Monitoring)

**Backend :**
```bash
cd app/backend
npm install @sentry/node
```

```javascript
// server.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Après les routes
app.use(Sentry.Handlers.errorHandler());
```

**Frontend :**
```bash
cd app/frontend
npm install @sentry/react
```

```javascript
// main.jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});

// Wrapper App
const SentryApp = Sentry.withProfiler(App);
```

**Temps estimé** : 3 heures

---

### 6.4 Ajouter Redis Cache (Backend)

**Installation :**
```bash
cd app/backend
npm install redis
```

```javascript
// lib/cache.js
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on('error', (err) => console.error('Redis Error:', err));

await redis.connect();

export async function getCache(key) {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key, data, ttlSeconds = 300) {
  await redis.setEx(key, ttlSeconds, JSON.stringify(data));
}

export async function deleteCache(key) {
  await redis.del(key);
}

export async function deleteCachePattern(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(keys);
}
```

**Usage exemple :**
```javascript
// api/leads.js
import { getCache, setCache } from '../lib/cache.js';

export default async function handler(req, res) {
  const cacheKey = `leads:${tenantId}:${page}:${limit}`;

  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  // Query DB
  const leads = await queryAll('SELECT ...', params);

  // Set cache (5 minutes)
  await setCache(cacheKey, { leads, total }, 300);

  res.json({ leads, total });
}
```

**Temps estimé** : 4 heures

---

## 📊 RÉSUMÉ DU PLAN

| Phase | Durée | Tâches | Priorité |
|-------|-------|--------|----------|
| **1. Sécurité** | 1 semaine | SSL, Cookies, Audit | 🔴 CRITIQUE |
| **2. Setup Tests** | 1 semaine | Jest, Vitest | 🔴 CRITIQUE |
| **3. Tests Critiques** | 2 semaines | Auth, CRUD, UI | 🟠 HAUTE |
| **4. Refactorisation** | 2 semaines | Composants géants | 🟠 HAUTE |
| **5. Accessibilité** | 1 semaine | ARIA, Clavier | 🟡 MOYENNE |
| **6. Performance** | 1 semaine | Virtual, Cache, Sentry | 🟡 MOYENNE |

---

## ✅ CHECKLIST DE VALIDATION

### Avant mise en production

**Sécurité :**
- [ ] SSL rejectUnauthorized: true en production
- [ ] Tokens en httpOnly cookies
- [ ] npm audit sans vulnérabilités critiques
- [ ] Pas de console.log sensibles

**Tests :**
- [ ] Coverage backend > 60%
- [ ] Coverage frontend > 50%
- [ ] Tests auth passent
- [ ] Tests CRUD passent

**Qualité :**
- [ ] ESLint sans erreurs
- [ ] Pas de composants > 500 lignes
- [ ] Hooks réutilisables extraits

**Accessibilité :**
- [ ] Lighthouse Accessibility > 90
- [ ] Navigation clavier fonctionnelle
- [ ] Modals avec focus trap

**Performance :**
- [ ] Lighthouse Performance > 80
- [ ] Listes virtualisées
- [ ] Sentry configuré

---

## 🎯 OBJECTIFS FINAUX

| Métrique | Avant | Après |
|----------|-------|-------|
| **Sécurité** | 4/10 | 8/10 |
| **Tests** | 0% | 60%+ |
| **Accessibilité** | 1/10 | 9/10 |
| **Performance** | 65/100 | 85/100 |
| **Maintenabilité** | 4/10 | 8/10 |
| **Score Global** | 5.9/10 | 8.5/10 |

---

**Document créé par Claude Code**
**Date : 30 décembre 2025**
