# agri-auth-service

Microservice d'authentification du projet **AgriIrrigation**, une application de suivi de l'irrigation agricole à architecture microservices.

Projet semestriel du Master DevOps & Cloud, ISET Tozeur, année universitaire 2026 / 2027.

## Rôle dans l'architecture

AgriIrrigation est composée de trois microservices indépendants, chacun dans son propre dépôt et avec sa propre base de données :

| Service | Rôle | Dépôt |
|---|---|---|
| **auth-service** (ce dépôt) | Inscription, connexion, jetons JWT | `agri-auth-service` |
| irrigation-service | Parcelles, planning d'arrosage, consommation d'eau | `agri-irrigation-service` |
| reporting-service | Statistiques et historique de consommation | `agri-reporting-service` |

Les manifests Kubernetes de l'ensemble sont dans le dépôt `agri-gitops` (déploiement continu avec ArgoCD).

## Technologies

- Node.js 24 et Express
- PostgreSQL 16 (base `auth_db`)
- bcryptjs pour le hachage des mots de passe
- jsonwebtoken pour les jetons JWT
- Jest et Supertest pour les tests

## Prérequis

- Git
- Node.js 18 ou plus récent, et npm
- Docker (pour PostgreSQL en local)

## Installation

```bash
git clone https://github.com/ferid-saad/agri-auth-service.git
cd agri-auth-service
npm install
```

## Base de données

Lancer PostgreSQL dans un conteneur Docker (port local 5433) :

```bash
docker run -d --name agri-postgres \
  -e POSTGRES_USER=agri \
  -e POSTGRES_PASSWORD=agri123 \
  -p 5433:5432 \
  -v agri-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Créer les bases de données des trois services :

```bash
docker exec agri-postgres psql -U agri -c "CREATE DATABASE auth_db;"
docker exec agri-postgres psql -U agri -c "CREATE DATABASE irrigation_db;"
docker exec agri-postgres psql -U agri -c "CREATE DATABASE reporting_db;"
```

La table `users` est créée automatiquement au démarrage du service.

> Les identifiants ci-dessus ne servent qu'au développement local. En production, ils sont fournis par un ConfigMap et un Secret Kubernetes.

## Configuration

Le service est configuré par variables d'environnement. Les valeurs par défaut conviennent au développement local.

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du service | `3000` |
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5433` |
| `DB_USER` | Utilisateur PostgreSQL | `agri` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `agri123` |
| `DB_NAME` | Nom de la base | `auth_db` |
| `JWT_SECRET` | Secret de signature des jetons JWT | `dev-secret-change-me` (développement uniquement) |
| `JWT_EXPIRES_IN` | Durée de validité des jetons | `1h` |

> En dehors du développement local, `JWT_SECRET` doit être défini explicitement. Dans Kubernetes, il sera stocké dans un Secret, et les autres services utiliseront la même valeur pour vérifier les jetons.

## Lancer le service

```bash
npm start
```

Le service écoute sur `http://localhost:3000`.

## API

### `GET /health`

Vérifie que le service est opérationnel (utilisé plus tard par les sondes Kubernetes).

```bash
curl http://localhost:3000/health
```

Réponse `200` :

```json
{ "status": "ok", "service": "auth-service" }
```

### `POST /register`

Crée un compte utilisateur. Le mot de passe est haché avec bcrypt avant stockage.

Corps de la requête :

```json
{ "email": "ali@mail.com", "password": "secret123" }
```

Exemple sous PowerShell :

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/register -ContentType "application/json" -Body '{"email":"ali@mail.com","password":"secret123"}'
```

Exemple avec curl :

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@mail.com","password":"secret123"}'
```

| Code | Signification |
|---|---|
| `201` | Compte créé, la réponse contient `id` et `email` |
| `400` | Email ou mot de passe manquant, ou mot de passe de moins de 6 caractères |
| `409` | Email déjà utilisé |
| `500` | Erreur serveur |

### `POST /login`

Authentifie un utilisateur et retourne un jeton JWT signé, valable une heure. Ce jeton doit ensuite être envoyé aux autres services dans l'en-tête `Authorization: Bearer <token>`.

Corps de la requête :

```json
{ "email": "ali@mail.com", "password": "secret123" }
```

Exemple sous PowerShell :

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/login -ContentType "application/json" -Body '{"email":"ali@mail.com","password":"secret123"}'
$r.token
```

Exemple avec curl :

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@mail.com","password":"secret123"}'
```

Réponse `200` :

```json
{ "token": "xxxxx.yyyyy.zzzzz" }
```

| Code | Signification |
|---|---|
| `200` | Identifiants valides, la réponse contient le jeton `token` |
| `400` | Email ou mot de passe manquant |
| `401` | Identifiants invalides (même réponse pour un email inconnu et un mauvais mot de passe) |
| `500` | Erreur serveur |

Le jeton contient `userId` et `email`. Son contenu est lisible par tout le monde (il est encodé, non chiffré) : seule la signature empêche sa modification, c'est pourquoi aucun mot de passe n'y figure.

## Tests

```bash
npm test
```

Les tests couvrent pour l'instant `GET /health`, le refus d'une inscription incomplète et le refus d'une connexion incomplète.

## Sécurité

- Mots de passe hachés avec bcrypt (10 tours de salage), jamais stockés en clair
- Requêtes SQL paramétrées (protection contre l'injection SQL)
- Validation des entrées
- Jetons JWT signés avec un secret, à durée de validité limitée
- Réponse identique pour un email inconnu et un mauvais mot de passe, afin de ne pas révéler quels comptes existent
- Aucun secret dans le code source du déploiement : mots de passe et clés fournis par variables d'environnement

## Structure du projet

```
agri-auth-service/
├── src/
│   ├── app.js            # Application Express et routes
│   ├── server.js         # Démarrage du serveur
│   ├── db.js             # Connexion PostgreSQL et création de la table users
│   └── routes/
│       └── auth.js       # Routes d'authentification
├── tests/
│   ├── health.test.js
│   ├── register.test.js
│   └── login.test.js
├── package.json
└── README.md
```

## Workflow Git

| Branche | Usage |
|---|---|
| `main` | Code stable |
| `develop` | Intégration |
| `feature/SCRUM-<n>-<description>` | Une branche par ticket Jira |

Chaque fonctionnalité est intégrée dans `develop` par une pull request relue. Les messages de commit commencent par la clé du ticket Jira, par exemple `SCRUM-9: route POST /register avec hachage bcrypt`.

## Avancement

| Ticket | User story | État |
|---|---|---|
| SCRUM-9 | Créer un compte | Terminé |
| SCRUM-21 | Se connecter (JWT) | Terminé |

Étapes suivantes de la chaîne DevOps : Dockerfile, pipeline CI avec scan Trivy, déploiement Kubernetes, GitOps avec ArgoCD, supervision avec Prometheus et Grafana.

## Auteur

Ferid Saad, Master DevOps & Cloud, ISET Tozeur.
