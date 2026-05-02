# Where's Laurent — Résumé de déploiement

## Architecture

| Couche | Technologie | URL |
|--------|-------------|-----|
| Frontend | Vite + React, Tailwind CSS, shadcn/ui | https://wl.evolversfr.com |
| Backend | AWS Lambda Node.js 20.x + API Gateway | https://kr9tgt8414.execute-api.eu-west-3.amazonaws.com |
| Base de données | DynamoDB (eu-west-3) | 4 tables |
| IaC | Terraform | `--auto-approve` |
| Source control | GitHub | https://github.com/ljacques99/whereslaurent |

## Fonctionnalités implémentées

- **Carte interactive** (react-simple-maps) — marqueurs verts (actuel), bleus (futur), gris (passé, admin)
- **Tableau chronologique** — trié par date, filtré selon le rôle
- **Authentification magic link** — JWT HS256, TTL 15 min, usage unique
- **Révocation globale des JWT** — timestamp de révocation dans DynamoDB, cache Lambda
- **CRUD admin** — lieux (avec géocodage auto) et utilisateurs
- **Géocodage automatique** — table statique 80+ villes → Nominatim/OSM → null
- **Groupement de marqueurs** — plusieurs passages dans la même ville fusionnés en un seul marqueur avec tooltip multi-passages
- **Auth réactive** — `AuthContext` React, logout efface la carte instantanément
- **Accès restreint** — carte et tableau visibles uniquement pour les utilisateurs authentifiés

## DynamoDB — Tables

| Table | Clé | Rôle |
|-------|-----|------|
| `wl-locations` | `id` (UUID) | Villes + dates |
| `wl-users` | `email` | Utilisateurs et rôles |
| `wl-magic-links` | `token` | Tokens d'auth (TTL 15 min) |
| `wl-token-revocations` | `revocation_id` | Historique des révocations JWT |

## Livraison des emails — Historique des problèmes

### Problème 1 — AWS SES (abandonné)
Envoi depuis `@gmail.com` via SES → échec SPF, emails en spam. Résolution : changer de provider.

### Problème 2 — Resend (abandonné)
- Plan gratuit : envoi restreint à l'adresse du compte uniquement
- Après vérification du domaine `evolversfr.com` : IPs partagées de Resend sur liste noire Free/Orange → emails bloqués pour `libertysurf.fr`

### Problème 3 — Brevo (solution retenue)
Meilleure réputation auprès des FAI français. Migration complète vers Brevo.

**Incidents DNS résolus :**
- Typo SPF : `spf.sendingblue.com` → `spf.sendinblue.com` (Cloudflare)
- Enregistrement MX manquant sur `evolversfr.com` : OVH exige un MX sur le domaine expéditeur (RFC 5321) — ajout de `MX 10 mail.evolversfr.com`
- MX avec mauvaise cible : `mail.evolvers.fr` → `mail.evolversfr.com` (même domaine, pas le domaine OVH)

### Problème 4 — OVH bloque les URLs `vercel.app` (résolu)
**Symptôme** : Brevo retourne `201 delivered` mais les emails n'arrivent jamais sur les adresses OVH (`extradrive.fr`, `evolvers.fr`). Pas de trace en spam non plus.

**Diagnostic** : OVH accepte le message SMTP (250 OK → Brevo dit "delivered") puis le supprime silencieusement en post-traitement. Le filtre anti-phishing d'OVH cible le domaine `vercel.app` — couramment utilisé pour les attaques de phishing, donc blacklisté.

**Preuve** : email plain-text sans URL → arrivé. Email plain-text avec URL `vercel.app` → silencieusement supprimé.

**Résolution** : ajout du domaine custom `wl.evolversfr.com` sur Vercel (CNAME → `cname.vercel-dns.com` dans Cloudflare). Le lien magic link pointe désormais vers `https://wl.evolversfr.com/auth/verify?token=...` au lieu de `https://whereslaurent.vercel.app/auth/verify?token=...`. OVH ne bloque plus.

**Règle importante** : le domaine d'envoi et le domaine du lien dans l'email doivent être cohérents et légitimes. Utiliser un domaine `vercel.app` ou autre plateforme mutualisée dans un email transactionnel déclenche les filtres anti-phishing des hébergeurs conservateurs (OVH, certains FAI).

## Configuration DNS (evolversfr.com sur Cloudflare)

| Type | Nom | Valeur |
|------|-----|--------|
| MX | `@` | `10 mail.evolversfr.com` |
| TXT | `@` | `v=spf1 include:spf.sendinblue.com ~all` |
| TXT | `@` | `v=DMARC1; p=none` |
| CNAME | `mail._domainkey` | clé DKIM Brevo |
| CNAME | `wl` | `cname.vercel-dns.com` (DNS only) |

## Variables d'environnement Lambda

| Variable | Valeur |
|----------|--------|
| `FRONTEND_URL` | `https://wl.evolversfr.com` |
| `JWT_SECRET` | *(dans terraform.tfvars, gitignored)* |
| `ADMIN_EMAIL` | `laurent.jacques79@gmail.com` |
| `BREVO_API_KEY` | *(dans terraform.tfvars, gitignored)* |
| `DEV_MODE` | `false` |

## Utilisateurs initiaux

| Email | Rôle |
|-------|------|
| `laurent.jacques79@gmail.com` | admin |

## Déploiement

```bash
# Backend
cd terraform && terraform apply --auto-approve -var-file=terraform.tfvars

# Frontend (auto-deploy sur push GitHub)
git push origin main
```

Les secrets (`terraform.tfvars`) sont gitignorés — les conserver localement ou dans un vault.
