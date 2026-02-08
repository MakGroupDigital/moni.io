# Guide de Déploiement - Moni.io

## Prérequis

- Node.js 18+ et npm
- Compte Firebase
- Compte Vercel (optionnel)
- Git

## Installation locale

```bash
# Cloner le repository
git clone https://github.com/MakGroupDigital/moni.io.git
cd moni.io

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Remplir les variables Firebase dans .env.local
```

## Configuration Firebase

### 1. Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Créer un nouveau projet "moni-io"
3. Activer Google Authentication
4. Créer une base de données Firestore en mode test

### 2. Configurer Firestore

Dans Firebase Console → Firestore Database → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Récupérer les clés Firebase

1. Aller dans Project Settings
2. Copier les clés Web
3. Remplir le fichier `.env.local`

## Déploiement sur Firebase Hosting

### 1. Installer Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Se connecter à Firebase

```bash
firebase login
```

### 3. Initialiser Firebase (déjà fait)

```bash
firebase init hosting
```

### 4. Construire et déployer

```bash
npm run build
firebase deploy
```

L'app sera disponible sur: `https://moni-io.web.app`

## Déploiement sur Vercel

### 1. Pousser le code sur GitHub

```bash
git push origin main
```

### 2. Connecter Vercel à GitHub

1. Aller sur [Vercel](https://vercel.com)
2. Cliquer "New Project"
3. Sélectionner le repository GitHub
4. Configurer les variables d'environnement

### 3. Ajouter les variables d'environnement

Dans Vercel Project Settings → Environment Variables:

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Déployer

Vercel va automatiquement déployer à chaque push sur main.

L'app sera disponible sur: `https://moni-io.vercel.app`

## Développement local

```bash
# Démarrer le serveur de développement
npm run dev

# L'app sera disponible sur http://localhost:5173
```

## Build pour production

```bash
npm run build

# Vérifier le build
npm run preview
```

## Checklist de déploiement

- [ ] Firebase Firestore activé
- [ ] Règles de sécurité Firestore configurées
- [ ] Variables d'environnement configurées
- [ ] Firebase CLI installé et connecté
- [ ] Vercel connecté à GitHub (optionnel)
- [ ] Favicon et manifest.json en place
- [ ] PWA manifest configuré
- [ ] Cache headers configurés dans firebase.json

## Troubleshooting

### "Failed to get document because the client is offline"

- Vérifier que Firestore est activé dans Firebase Console
- Vérifier les règles de sécurité Firestore
- Vérifier la connexion Internet

### Erreur de déploiement Firebase

```bash
# Vérifier le statut
firebase status

# Redéployer
firebase deploy --force
```

### Variables d'environnement non chargées

- Vérifier que le fichier `.env.local` existe
- Vérifier que les variables commencent par `VITE_`
- Redémarrer le serveur de développement

## Support

Pour plus d'aide:
- [Documentation Firebase](https://firebase.google.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Vite](https://vitejs.dev)
