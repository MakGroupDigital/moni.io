# Configuration de Moni.io

## Installation des dépendances

Après avoir mis à jour le `package.json` avec Firebase et qrcode, installez les dépendances:

```bash
npm install
```

## Configuration Firebase

Le projet est déjà configuré avec Firebase. Les identifiants sont dans `lib/firebase.ts`.

### Authentification Google

Pour que l'authentification Google fonctionne:

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez le projet "moni-io"
3. Allez dans Authentication > Sign-in method
4. Activez Google Sign-in
5. Configurez les domaines autorisés (localhost:5173 pour le développement)

### Firestore Database

1. Allez dans Firestore Database
2. Créez une base de données en mode test (pour le développement)
3. Créez une collection "users" (elle sera créée automatiquement lors de la première inscription)

## Démarrage du développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## Structure du projet

- `views/` - Pages principales (Dashboard, Settings, etc.)
- `components/` - Composants réutilisables (Modals, etc.)
- `contexts/` - Contextes React (AuthContext, etc.)
- `lib/` - Utilitaires et configuration (Firebase, Moni utils)
- `types.ts` - Définitions TypeScript

## Flux d'authentification

1. **Splash Screen** - Affichée pendant 3 secondes au démarrage
2. **Login** - Connexion via Google
3. **Onboarding** - Présentation du numéro Moni et du QR code
4. **Dashboard** - Application principale

## Génération du numéro Moni

Format: `MN1000` + numéro d'ordre
- 1er utilisateur: `MN10001`
- 2e utilisateur: `MN10002`
- etc.

Le QR code contient: `{ moniNumber, email, name }`
