# Spécifications Techniques — Where's Laurent

## 1. Vue d'ensemble

**Nom du produit :** Where's Laurent  
**Objectif :** Application web permettant de suivre en temps réel et à venir les déplacements géographiques de Laurent.  
**URL cible :** Déployée sur Vercel (frontend) + AWS (backend)

---

## 2. Architecture générale

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  Vite/React     │ ─────────────► │  AWS Lambda          │
│  (Vercel)       │                │  (API publique)      │
│  Frontend       │ ◄───────────── │  eu-west-3           │
└─────────────────┘                └──────────┬───────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │  DynamoDB            │
                                   │  (eu-west-3)         │
                                   └──────────────────────┘
```

**Provisioning :** Terraform avec `--auto-approve`  
**Région AWS :** `eu-west-3` (Paris)  
**Source control :** GitHub  
**Hébergement frontend :** Vercel

---

## 3. Infrastructure AWS (Terraform)

### 3.1 DynamoDB

| Table | Clé primaire | Attributs |
|-------|-------------|-----------|
| `wl-locations` | `id` (String) | `city`, `country`, `arrival_date`, `departure_date` |
| `wl-users` | `email` (String) | `role` (`admin` \| `visitor`), `created_at` |
| `wl-magic-links` | `token` (String) | `email`, `expires_at`, `used` |
| `wl-token-revocations` | `revocation_id` (String) | `revoked_at`, `revoked_by` |

### 3.2 Lambda

- **Runtime :** Node.js 20.x  
- **Accès :** Public (Function URL ou API Gateway)  
- **Endpoints exposés :**

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/locations` | Non | Liste lieux présents + futurs |
| GET | `/locations/all` | Admin | Liste tous les lieux (passés inclus) |
| POST | `/locations` | Admin | Créer un lieu |
| PUT | `/locations/:id` | Admin | Modifier un lieu |
| DELETE | `/locations/:id` | Admin | Supprimer un lieu |
| GET | `/users` | Admin | Liste des utilisateurs |
| POST | `/users` | Admin | Créer un utilisateur |
| DELETE | `/users/:email` | Admin | Supprimer un utilisateur |
| POST | `/auth/magic-link` | Non | Envoyer un magic link |
| GET | `/auth/verify` | Non | Vérifier le token et créer session |
| POST | `/auth/revoke-all` | Admin | Révoquer tous les JWT actifs |

---

## 4. Modèle de données

### Location
```typescript
{
  id: string             // UUID
  city: string           // ex: "Paris"
  country: string        // ex: "France"
  arrival_date: string   // ISO 8601 "2026-05-10"
  departure_date: string // ISO 8601 "2026-05-15"
  coordinates: {         // Résolues côté frontend via geocoding ou table statique
    lat: number
    lng: number
  }
}
```

### User
```typescript
{
  email: string       // Identifiant unique
  role: "admin" | "visitor"
  created_at: string
}
```

### Session (JWT signé)
```typescript
{
  email: string
  role: "admin" | "visitor"
  issued_at: number   // Timestamp UNIX — utilisé pour la révocation
  expires_at: number
}
```

### TokenRevocation
```typescript
{
  revocation_id: string  // UUID
  revoked_at: number     // Timestamp UNIX — tous les JWT émis avant cette date sont invalides
  revoked_by: string     // Email de l'admin ayant déclenché la révocation
}
```

---

## 5. Authentification — Magic Link

**Flux :**
1. L'utilisateur saisit son email
2. Le système vérifie que l'email existe en base
3. Un token unique (UUID v4, TTL 15 min) est généré et stocké dans DynamoDB
4. Un email est envoyé avec le lien `https://[domaine]/auth/verify?token=xxx`
5. Au clic, le token est validé → session JWT créée → redirection vers l'app
6. Le token est marqué `used: true` (usage unique)

**Utilisateur admin initial :** `laurent.jacques79@gmail.com`  
**Service email :** AWS SES (eu-west-3) ou Resend

---

## 6. Révocation globale des JWT (Admin)

### Principe

La révocation ne maintient pas de liste noire par token (trop coûteux à l'échelle). Elle repose sur un **timestamp de révocation global** : tout JWT dont le champ `issued_at` est antérieur à ce timestamp est considéré invalide.

### Flux

1. L'admin clique sur **"Révoquer toutes les sessions"** dans l'interface
2. Une modale de confirmation est affichée ("Cette action déconnectera tous les utilisateurs connectés.")
3. En cas de confirmation, appel `POST /auth/revoke-all`
4. La Lambda enregistre dans `wl-token-revocations` un nouvel enregistrement avec `revoked_at = now()`
5. La Lambda met en cache en mémoire ce timestamp pour les vérifications suivantes
6. À chaque requête authentifiée, le middleware vérifie que `jwt.issued_at >= dernier revoked_at`
7. Si le JWT est antérieur, la réponse est `401 Unauthorized` et le client redirige vers `/login`

### Stockage du timestamp de révocation

- **DynamoDB** `wl-token-revocations` : source de vérité persistante
- **Cache Lambda** (variable module-level) : rechargé depuis DynamoDB au démarrage du conteneur et après chaque révocation, pour minimiser les lectures DynamoDB à chaque requête

### Interface admin

- Bouton visible dans l'onglet **Utilisateurs** : `Révoquer toutes les sessions actives`
- Modale de confirmation avec message d'avertissement explicite
- Notification de succès après exécution
- Affichage de la date/heure de la dernière révocation globale

---

## 7. Frontend — Vite + React

### 7.1 Pages & Navigation

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | **Authentifié** | Carte + tableau — redirige vers `/login` si non connecté |
| `/login` | Public | Formulaire email magic link |
| `/auth/verify` | Public | Traitement du token |
| `/admin/locations` | Admin | CRUD des villes |
| `/admin/users` | Admin | CRUD des utilisateurs + révocation JWT |

**Règle d'accès :** La carte et le tableau de villes ne s'affichent que pour les utilisateurs authentifiés (visiteurs et admins). Tout utilisateur non connecté accédant à `/` est redirigé vers `/login`. Le endpoint `GET /locations` de la Lambda retourne `401` si aucun JWT valide n'est fourni.

### 7.2 Carte interactive

- **Bibliothèque :** react-simple-maps ou Leaflet.js
- **Monde entier** affiché par défaut
- **Zoom** : molette souris + pinch mobile
- **Marqueurs colorés :**
  - **Vert** : ville où Laurent est actuellement (aujourd'hui entre `arrival_date` et `departure_date`)
  - **Bleu** : villes futures (`arrival_date` > aujourd'hui)
  - **Gris** *(admin uniquement)* : villes passées (`departure_date` < aujourd'hui)
- **Tooltip au survol** : nom de la ville, pays, dates de présence

### 7.3 Tableau chronologique

- Colonnes : Ville | Pays | Date d'arrivée | Date de départ | Statut
- Tri par date d'arrivée ascendante
- Visiteurs : présent + futur uniquement
- Admin : toutes les entrées
- Mise en évidence de la ligne "en cours"

### 7.4 Onglet Admin — Gestion des lieux

- Liste paginée des villes
- Formulaire : ville, pays, date arrivée, date départ
- Actions : Éditer, Supprimer (confirmation modale)

### 7.5 Onglet Admin — Gestion des utilisateurs

- Liste des utilisateurs (email + rôle)
- Formulaire création : email + rôle (`admin` / `visitor`)
- Suppression avec confirmation
- L'identifiant unique est l'email (pas de mot de passe)
- **Bouton "Révoquer toutes les sessions"** avec modale de confirmation
- Affichage de la date de la dernière révocation globale

---

## 8. Design & UX

- **Style :** Professionnel, épuré, moderne — dark/light adaptable
- **Framework CSS :** Tailwind CSS
- **Composants :** shadcn/ui ou Radix UI
- **Typographie :** Inter ou Geist
- **Responsive :** Desktop et mobile
- **Langue de l'interface :** Anglais (nom de l'app) / Français (contenu)

---

### 8.1 Géocodage automatique des coordonnées

Quand l'admin crée ou modifie une ville sans fournir latitude/longitude, la Lambda résout les coordonnées automatiquement dans cet ordre de priorité :

1. **Table statique** intégrée au code (80+ villes prédéfinies) — résolution instantanée
2. **Nominatim / OpenStreetMap** (API publique, gratuite) — appelée si la ville n'est pas dans la table statique, avec le header `User-Agent: WheresLaurent/1.0`
3. **null** — si les deux méthodes échouent, les coordonnées restent nulles (la ville apparaît dans le tableau mais pas sur la carte)

L'admin peut toujours forcer des coordonnées manuelles via les champs Latitude/Longitude du formulaire.

---

## 9. Sécurité

- Toutes les routes Lambda admin valident le JWT avant traitement
- Le middleware vérifie `jwt.issued_at >= dernière révocation globale` à chaque requête
- Les tokens magic link sont à usage unique et expirent en 15 min
- CORS configuré pour n'autoriser que le domaine Vercel
- Pas de clés AWS exposées côté frontend (tout passe par Lambda)

---

## 10. Déploiement

### Terraform (ordre d'exécution)
1. DynamoDB tables (dont `wl-token-revocations`)
2. IAM Role Lambda
3. Lambda function (zip depuis le code)
4. Function URL ou API Gateway
5. SES domain/email identity
6. Seed utilisateur admin initial (`laurent.jacques79@gmail.com`)

### Vercel
- Connecté au dépôt GitHub (auto-deploy sur `main`)
- Variable d'env : `VITE_API_URL` → URL publique de la Lambda

### Tests pré-déploiement
- `terraform validate` + `terraform plan`
- `terraform apply --auto-approve`
- Tests des endpoints Lambda (curl / script)
- Test de la révocation : émettre un JWT, révoquer, vérifier rejet du JWT
- Smoke test frontend (magic link → connexion → carte visible)

---

## 11. Ordre de réalisation suggéré

1. Initialisation repo GitHub + structure projet
2. Terraform : DynamoDB + Lambda skeleton + déploiement
3. Implémentation des endpoints Lambda
4. Authentification magic link + middleware JWT (avec vérification révocation)
5. Endpoint `POST /auth/revoke-all` + logique de cache Lambda
6. Tests Lambda (curl)
7. Frontend Vite : carte + tableau (mode public)
8. Vues admin (locations + users + bouton révocation)
9. Déploiement Vercel + variables d'env
10. Tests end-to-end complets (dont scénario révocation)
