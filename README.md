# Moni.io - Portefeuille Numérique

<div align="center">
  <img src="/onelogo.png" alt="Moni.io Logo" width="200" height="200">
  
  **Portefeuille numérique sécurisé pour gérer votre argent**
  
  [Déploiement Firebase](https://moni-io.web.app) • [Déploiement Vercel](https://moni-io.vercel.app) • [Documentation](./DEPLOYMENT.md)
</div>

---

## 🚀 Fonctionnalités

- 💳 **Portefeuille Sécurisé** - Gérez votre argent en toute sécurité avec Firebase
- 📱 **Transferts Rapides** - Envoyez de l'argent instantanément à d'autres utilisateurs
- 🏦 **Mobile Money** - Intégration avec tous les opérateurs (Orange Money, MTN, Airtel, etc.)
- 💰 **Dépôts et Retraits** - Déposez et retirez facilement via mobile money ou agents
- 📊 **Statistiques** - Suivez vos transactions mensuelles
- 🔔 **Notifications Persistantes** - Recevez des notifications en temps réel
- 🌙 **Interface Moderne** - Design élégant avec mode sombre
- 📲 **Progressive Web App** - Installez l'app sur votre appareil

## 🛠️ Stack Technologique

| Technologie | Version | Utilisation |
|-------------|---------|------------|
| React | 19.2.4 | Framework UI |
| TypeScript | 5.8.2 | Typage statique |
| Vite | 6.2.0 | Build tool |
| Tailwind CSS | Latest | Styling |
| Firebase | 10.7.0 | Backend (Auth, Firestore) |
| React DOM | 19.2.4 | Rendu DOM |

## 📋 Prérequis

- **Node.js** 18 ou supérieur
- **npm** ou **yarn**
- **Compte Firebase** (gratuit)
- **Compte Vercel** (optionnel, gratuit)
- **Git**

## 🚀 Installation Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/MakGroupDigital/moni.io.git
cd moni.io

# 2. Installer les dépendances
npm install

# 3. Copier le fichier d'environnement
cp .env.example .env.local

# 4. Ajouter vos clés Firebase dans .env.local
# Voir la section Configuration ci-dessous

# 5. Démarrer le serveur de développement
npm run dev
```

L'app sera disponible sur `http://localhost:5173`

## 🔧 Configuration

### 1. Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Créer un nouveau projet "moni-io"
3. Activer **Google Authentication**
4. Créer une base de données **Firestore** en mode test

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

1. Aller dans **Project Settings**
2. Copier les clés Web
3. Remplir le fichier `.env.local`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 💻 Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## 🚀 Déploiement

### Option 1: Firebase Hosting

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Déployer
npm run build
firebase deploy
```

**URL**: `https://moni-io.web.app`

### Option 2: Vercel

1. Pousser le code sur GitHub
2. Aller sur [Vercel](https://vercel.com)
3. Cliquer "New Project" et sélectionner le repository
4. Ajouter les variables d'environnement
5. Vercel va automatiquement déployer

**URL**: `https://moni-io.vercel.app`

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour les instructions détaillées.

## 📁 Structure du Projet

```
moni.io/
├── components/              # Composants React réutilisables
│   ├── DepositModal.tsx     # Modal de dépôt
│   ├── WithdrawModal.tsx    # Modal de retrait
│   ├── SendModal.tsx        # Modal d'envoi d'argent
│   ├── P2PModal.tsx         # Modal P2P
│   ├── BillsModal.tsx       # Modal de paiement de factures
│   ├── NotificationCenter.tsx # Centre de notifications
│   └── ...
├── contexts/                # Contextes React
│   └── AuthContext.tsx      # Contexte d'authentification
├── lib/                     # Utilitaires et services
│   ├── firebase.ts          # Configuration Firebase
│   ├── transactionUtils.ts  # Utilitaires de transactions
│   ├── useNotifications.ts  # Hook pour les notifications
│   └── ...
├── views/                   # Pages principales
│   ├── Dashboard.tsx        # Tableau de bord
│   ├── Login.tsx            # Page de connexion
│   ├── Splash.tsx           # Écran de démarrage
│   ├── Onboarding.tsx       # Onboarding
│   └── ...
├── public/                  # Fichiers statiques
│   ├── favicon-32x32.png    # Favicon
│   ├── manifest.json        # PWA manifest
│   └── onelogo.png          # Logo
├── index.html               # Point d'entrée HTML
├── index.tsx                # Point d'entrée React
├── App.tsx                  # Composant principal
├── types.ts                 # Types TypeScript
├── vite.config.ts           # Configuration Vite
├── firebase.json            # Configuration Firebase Hosting
├── vercel.json              # Configuration Vercel
└── package.json             # Dépendances
```

## 🔐 Sécurité

- ✅ Authentification Firebase sécurisée
- ✅ Règles Firestore pour contrôler l'accès
- ✅ Variables d'environnement pour les clés sensibles
- ✅ HTTPS obligatoire en production
- ✅ Transactions batch pour l'intégrité des données

## 📱 Progressive Web App (PWA)

L'application peut être installée sur votre appareil:

- 📲 Icônes d'application
- 🔔 Notifications push
- 📴 Fonctionnement hors ligne (partiellement)
- 🎨 Écran de démarrage personnalisé

## 🔄 Flux de Transactions

### Dépôt
1. Utilisateur saisit le montant
2. Choisit la méthode (Mobile Money ou Agent)
3. Transaction créée dans Firestore
4. Solde mis à jour en temps réel
5. Confirmation affichée

### Transfert
1. Utilisateur saisit le numéro Moni du destinataire
2. Saisit le montant et un message optionnel
3. Deux transactions créées (envoi + réception)
4. Soldes mis à jour pour les deux utilisateurs
5. Notification persistante envoyée au destinataire

### Retrait
1. Utilisateur saisit le montant
2. Choisit la méthode (Mobile Money ou Agent)
3. Transaction créée dans Firestore
4. Solde diminué
5. Confirmation affichée

## 🤝 Contribution

Les contributions sont bienvenues! Veuillez:

1. Fork le repository
2. Créer une branche pour votre feature (`git checkout -b feature/AmazingFeature`)
3. Faire un commit avec un message clair (`git commit -m 'Add AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

Pour toute question ou problème:

- 📧 Email: dev@makgroup.com
- 🐛 Issues: [GitHub Issues](https://github.com/MakGroupDigital/moni.io/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/MakGroupDigital/moni.io/discussions)

## 🔗 Ressources Utiles

- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🎯 Roadmap

- [ ] Support des paiements par carte bancaire
- [ ] Intégration avec plus d'opérateurs mobile money
- [ ] Historique des transactions détaillé
- [ ] Export des transactions en PDF
- [ ] Support multi-devises
- [ ] Application mobile native (React Native)
- [ ] Système de parrainage
- [ ] Intégration avec les APIs bancaires

## 👥 Équipe

Développé avec ❤️ par **MakGroup Digital**

- 👨‍💻 Développement
- 🎨 Design
- 📱 Mobile
- 🔒 Sécurité

---

<div align="center">
  
  **[⬆ Retour en haut](#moniio---portefeuille-numérique)**
  
  Fait avec ❤️ pour la communauté africaine
  
</div>
