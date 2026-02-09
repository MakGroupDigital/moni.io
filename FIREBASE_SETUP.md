# Configuration Firebase pour le Développement

## Installation de Firebase CLI

Si Firebase CLI n'est pas encore installé, installez-le avec :

```bash
npm install -g firebase-tools
```

## Authentification Firebase

Connectez-vous à votre compte Firebase :

```bash
firebase login
```

## Déployer les Règles de Sécurité Firestore

Pour déployer les règles de sécurité très permissives (développement uniquement) :

```bash
firebase deploy --only firestore:rules
```

## Règles de Sécurité Actuelles

Les règles dans `firestore.rules` permettent :
- ✅ Tous les utilisateurs authentifiés peuvent lire et écrire dans Firestore
- ❌ Les utilisateurs non authentifiés ne peuvent pas accéder

**⚠️ ATTENTION** : Ces règles sont très permissives et ne doivent être utilisées que pendant le développement. Avant de passer en production, mettez à jour les règles pour être plus restrictives.

## Vérifier les Règles Déployées

Vous pouvez vérifier les règles déployées dans la [Console Firebase](https://console.firebase.google.com/) :
1. Allez à Firestore Database
2. Cliquez sur l'onglet "Rules"
3. Vérifiez que les règles sont correctement déployées

## Dépannage

Si vous avez l'erreur "Failed to get document because the client is offline" :

1. Vérifiez votre connexion Internet
2. Vérifiez que les règles Firestore sont correctement déployées
3. Vérifiez que votre utilisateur est authentifié
4. Videz le cache du navigateur et rechargez la page
