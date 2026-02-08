# CAHIER DES CHARGES COMPLET : MONI.IO

## 1. PRÉSENTATION DU PROJET

### Nom de l'application
**Moni.io**

### Secteur
Fintech / Paiement Mobile

### Cible
Particuliers et entrepreneurs en Afrique ayant besoin de fluidifier leurs flux d'argent locaux et internationaux.

### 1.1 Description
Moni.io est une application de paiement hybride qui fait le pont entre les systèmes de paiement globaux (PayPal) et les écosystèmes locaux (Mobile Money). L'idée est de simplifier l'envoi, la réception, le dépôt et le retrait d'argent avec une expérience utilisateur fluide, rapide et sécurisée.

### 1.2 Objectifs principaux
- Permettre le retrait de fonds PayPal vers un wallet local
- Faciliter les transferts de pair à pair (P2P) instantanés
- Garantir l'accès aux services même en cas de faible connectivité (Mode Hors-ligne)

---

## 2. CHARTE GRAPHIQUE & IDENTITÉ VISUELLE

L'identité doit inspirer la confiance, la modernité et la rapidité.

### Logo
Logotype "moni" en minuscule, police arrondie et moderne. La lettre "n" et le "i" sont reliés par une onde fluide qui se termine par le point du ".io".

### Palette de couleurs
- **Bleu Nuit (#0D1B2A)** : Couleur principale pour le fond (Dark Mode), inspire le sérieux
- **Cyan / Menthe Électrique (#00F5D4)** : Couleur d'accent pour les boutons, les ondes et les succès
- **Blanc Cassé (#F8F9FA)** : Pour les textes sur fond sombre

### Typographie
- **Titres** : Montserrat (Bold)
- **Corps de texte** : Poppins (Regular/Medium)

### Iconographie
Minimaliste, traits fins (Outline), style tech

---

## 3. SPÉCIFICATIONS TECHNIQUES (STACK)

- **Framework** : Next.js 15+ (App Router) pour le Web & Mobile
- **Encapsulation** : Capacitor.js (pour l'accès natif et les Live Updates via Ionic Appflow)
- **Backend** : Firebase Suite
  - **Firestore** : Base de données NoSQL en temps réel
  - **Cloud Functions** : Logique métier (Calculs, API PayPal, Webhooks)
- **Authentication** : Numéro de téléphone + Biométrie
- **App Check** : Protection contre l'usage abusif des APIs

---

## 4. FONCTIONNALITÉS DÉTAILLÉES (POINT PAR POINT)

### 4.1 Système de Wallet
- Chaque utilisateur possède un compte unique lié à son numéro de téléphone
- Affichage du solde en temps réel avec persistance locale (Firebase Offline Persistence)
- Historique des transactions avec statut (En attente, Complété, Échoué)

### 4.2 Module PayPal
- Interface de liaison de compte PayPal via OAuth
- Fonction de retrait : L'utilisateur saisit le montant → Calcul automatique des frais → Appel de la Cloud Function → Transfert vers le wallet Moni
- Estimation du temps de réception affichée clairement

### 4.3 Transferts & Paiements (P2P)
- Envoi d'argent par scan de QR Code (Capacitor Barcode Scanner)
- Envoi par recherche de numéro de téléphone dans les contacts
- Notifications Push instantanées (FCM) à la réception

### 4.4 Connectivité & Accessibilité (Innovation)
- **Cache Firestore** : Consultation du solde et des transactions sans internet
- **Transaction Queue** : Si hors-ligne, la transaction est enregistrée localement et envoyée dès que le signal revient
- **Fallback USSD** : Génération automatique d'une chaîne USSD pour les opérations critiques sans data (ex: *144*...#)

### 4.5 Sécurité & KYC
- Vérification d'identité : Upload de la pièce d'identité via l'appareil photo
- Accès Natif : Verrouillage de l'application via FaceID ou Empreinte digitale (Capacitor Biometrics)

---

## 5. STRUCTURE DES DONNÉES (SCHEMA FIRESTORE)

### Collection `users`
```
{
  display_name: string,
  phone: string (unique),
  balance: number,
  currency: string,
  kyc_verified: boolean
}
```

### Collection `transactions`
```
{
  amount: number,
  currency: string,
  from_id: string (user_id),
  to_id: string (user_id),
  type: enum (PAYPAL, P2P, DEPOSIT, WITHDRAW),
  timestamp: timestamp,
  status: enum (PENDING, COMPLETED, FAILED)
}
```

---

## 6. MAINTENANCE ET ÉVOLUTION

- **Live Updates** : Utilisation de Capacitor pour mettre à jour l'UI et corriger les bugs sans passer par le Play/App Store
- **Logs** : Firebase Crashlytics pour surveiller les erreurs en temps réel

---

## 7. ROADMAP DE DÉVELOPPEMENT

### Phase 1 : MVP (Semaines 1-4)
- [ ] Setup Firebase et authentification par téléphone
- [ ] Interface de wallet avec solde en temps réel
- [ ] Historique des transactions
- [ ] Design system et composants UI

### Phase 2 : Intégration PayPal (Semaines 5-8)
- [ ] OAuth PayPal
- [ ] Fonction de retrait avec calcul des frais
- [ ] Notifications push (FCM)

### Phase 3 : P2P & Offline (Semaines 9-12)
- [ ] Transferts P2P par téléphone
- [ ] QR Code Scanner
- [ ] Cache Firestore et Transaction Queue
- [ ] Fallback USSD

### Phase 4 : Sécurité & KYC (Semaines 13-16)
- [ ] Vérification d'identité
- [ ] Biométrie (FaceID/Empreinte)
- [ ] App Check Firebase

### Phase 5 : Capacitor & Mobile (Semaines 17-20)
- [ ] Intégration Capacitor
- [ ] Build iOS et Android
- [ ] Live Updates via Ionic Appflow

---

## 8. CRITÈRES DE SUCCÈS

- ✅ Temps de chargement < 2s
- ✅ Taux de conversion inscription > 40%
- ✅ Transactions P2P complétées en < 5s
- ✅ Disponibilité 99.9% (SLA Firebase)
- ✅ Support offline pour consultation du solde
- ✅ Zéro crash en production (Crashlytics)

---

**Document créé le** : 8 février 2026  
**Version** : 1.0  
**Statut** : En cours de développement
