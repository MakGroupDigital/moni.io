export type LegalDocumentId = 'about' | 'terms' | 'acceptable-use' | 'privacy' | 'cookies';

export interface LegalSection {
  title: string;
  body: string[];
  items?: string[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  shortTitle: string;
  summary: string;
  effectiveDate: string;
  lastUpdated: string;
  publicPath: string;
  sections: LegalSection[];
}

export const LEGAL_OWNER = 'MboMa & Co.';
export const LEGAL_BRAND = 'Moni.io';
export const LEGAL_WEBSITE = 'https://mboma.org';
export const LEGAL_LAST_UPDATED = '15 mai 2026';

export const legalDocuments: LegalDocument[] = [
  {
    id: 'about',
    title: 'À propos de Moni.io',
    shortTitle: 'À propos',
    summary: 'Présentation de Moni.io, produit et marque déposée de MboMa & Co.',
    effectiveDate: LEGAL_LAST_UPDATED,
    lastUpdated: LEGAL_LAST_UPDATED,
    publicPath: '/legal/a-propos.html',
    sections: [
      {
        title: 'Identité du service',
        body: [
          'Moni.io est un produit financier numérique et une marque déposée de la société MboMa & Co. Le site institutionnel de MboMa & Co. est accessible à l’adresse mboma.org. Dans les présents documents, les expressions “Moni”, “Moni.io”, “nous”, “notre” ou “la plateforme” désignent le service numérique Moni.io, ses interfaces web, son application web progressive, ses services de portefeuille, ses pages publiques et les modules associés.',
          'Moni.io a été conçu comme un portefeuille digital pensé pour les usages africains: dépôt par mobile money et partenaires de paiement, transfert entre utilisateurs, paiement par QR code, demande de paiement, lien de paiement, gestion de cartes enregistrées, paiement de services du quotidien et préparation de retraits vers des comptes externes compatibles, notamment PayPal lorsque l’utilisateur choisit de lier son compte.'
        ]
      },
      {
        title: 'Mission',
        body: [
          'La mission de Moni.io est de simplifier l’accès aux paiements numériques pour les utilisateurs, commerçants, indépendants, créateurs, familles et petites entreprises qui ont besoin d’un outil rapide pour recevoir, envoyer, déposer, retirer, payer et suivre leur argent dans un environnement mobile.',
          'Moni.io cherche à réduire la complexité entre les moyens de paiement internationaux et les usages locaux. L’objectif est de proposer une expérience claire: un numéro Moni, un portefeuille, un solde, des opérations confirmées par PIN ou biométrie, des notifications, un historique et des parcours simples pour les paiements du quotidien.'
        ]
      },
      {
        title: 'Services proposés',
        body: [
          'La plateforme peut proposer plusieurs modules selon le pays, la disponibilité technique, les partenaires actifs et les autorisations nécessaires: dépôt mobile money, paiement par intégration MaxiCash ou autres prestataires, transfert Moni à Moni, paiement P2P, paiement par scanner QR, génération de lien de paiement, badge caisse, paiement de factures, paiement de services numériques, retrait vers PayPal, liaison de compte PayPal, gestion de cartes enregistrées dans l’interface et installation PWA.',
          'Certains services dépendent de partenaires tiers. Un service peut être disponible dans l’interface mais limité, suspendu ou indisponible si le partenaire, l’opérateur, le fournisseur, PayPal, MaxiCash, un réseau mobile, une banque, un agrégateur ou un prestataire technique ne répond pas, refuse une transaction, applique une limite ou impose une vérification complémentaire.'
        ],
        items: [
          'Portefeuille Moni: affichage du solde, historique, notifications et opérations internes.',
          'Dépôts: alimentation du portefeuille par des moyens de paiement compatibles.',
          'Retraits: demande de sortie de fonds vers un moyen externe compatible, notamment PayPal si activé.',
          'Paiements: transferts, paiements QR, paiements P2P, liens de paiement et factures.',
          'Sécurité: PIN obligatoire, biométrie WebAuthn lorsque disponible, verrouillage à l’ouverture de l’app.'
        ]
      },
      {
        title: 'Positionnement',
        body: [
          'Moni.io se positionne comme une solution de paiement numérique orientée Afrique, avec une attention particulière aux besoins de paiement local, aux portefeuilles mobiles, aux commerçants qui souhaitent être payés rapidement, aux utilisateurs qui veulent centraliser leurs opérations et aux personnes qui ont besoin d’un pont entre PayPal et les usages locaux.',
          'Sauf mention réglementaire contraire publiée par MboMa & Co., Moni.io ne doit pas être compris comme une banque traditionnelle. Les services de paiement, dépôt, retrait, conversion, settlement et traitement peuvent être fournis directement ou indirectement par des prestataires, opérateurs ou partenaires autorisés dans leurs domaines respectifs.'
        ]
      },
      {
        title: 'Engagement utilisateur',
        body: [
          'Nous cherchons à fournir une expérience simple, mais les paiements restent des opérations sérieuses. L’utilisateur doit saisir des informations exactes, vérifier les montants, confirmer les bénéficiaires, protéger son PIN, utiliser un appareil sécurisé et signaler rapidement toute activité suspecte.',
          'Le développement de Moni.io est évolutif. Les fonctionnalités peuvent être améliorées, renommées, déplacées, désactivées ou étendues. Les documents légaux seront adaptés pour refléter les nouveaux services, les nouvelles obligations, les nouveaux partenaires et les exigences de conformité.'
        ]
      }
    ]
  },
  {
    id: 'terms',
    title: 'Conditions générales d’utilisation de Moni.io',
    shortTitle: 'Conditions',
    summary: 'Règles contractuelles applicables à l’accès et à l’utilisation de Moni.io.',
    effectiveDate: LEGAL_LAST_UPDATED,
    lastUpdated: LEGAL_LAST_UPDATED,
    publicPath: '/legal/conditions-generales.html',
    sections: [
      {
        title: 'Acceptation des conditions',
        body: [
          'En créant un compte, en vous connectant, en installant l’application web progressive, en utilisant un lien de paiement, en générant un QR code, en demandant un dépôt, un retrait, un transfert ou tout autre service Moni.io, vous acceptez les présentes conditions générales, la politique d’utilisation acceptable, la politique de confidentialité, la politique de cookies et toute règle spécifique affichée dans l’interface.',
          'Si vous utilisez Moni.io pour le compte d’une entreprise, d’une organisation, d’un commerce, d’une association ou d’un tiers, vous déclarez avoir le pouvoir d’accepter ces conditions pour cette entité et d’engager cette entité dans les limites de votre mandat.'
        ]
      },
      {
        title: 'Éligibilité et compte utilisateur',
        body: [
          'L’utilisateur doit disposer de la capacité légale d’utiliser des services financiers numériques dans son pays de résidence. Moni.io peut refuser, suspendre ou limiter l’accès si l’utilisateur ne fournit pas les informations nécessaires, si son comportement présente un risque, si une obligation légale l’exige ou si un partenaire de paiement refuse de traiter une opération.',
          'Le compte Moni est personnel, sauf si un compte professionnel ou marchand est explicitement activé. L’utilisateur ne doit pas vendre, louer, partager ou transférer son compte. Les informations de profil, numéro Moni, email, téléphone, identité, documents et moyens de paiement doivent être exacts, actuels et appartenir à l’utilisateur ou être utilisés avec autorisation.'
        ],
        items: [
          'Un seul compte peut être autorisé par personne, sauf accord écrit ou fonctionnalité multi-compte validée.',
          'L’utilisateur doit garder son email, son appareil et son numéro de téléphone sous contrôle.',
          'Moni.io peut demander une vérification additionnelle avant d’augmenter les limites ou d’exécuter certaines opérations.'
        ]
      },
      {
        title: 'Sécurité, PIN et biométrie',
        body: [
          'Chaque accès à l’application Moni.io peut être protégé par un PIN obligatoire. Le PIN sert à déverrouiller l’application et à confirmer les opérations sensibles. Lorsque le navigateur et l’appareil le permettent, l’utilisateur peut activer une authentification biométrique réelle via les mécanismes du système, par exemple Face ID, empreinte digitale ou déverrouillage local.',
          'La biométrie ne remplace pas entièrement le PIN. Le PIN reste la méthode de secours lorsque la biométrie est indisponible, refusée, expirée, désactivée ou non prise en charge par l’appareil. L’utilisateur reste responsable de la sécurité de son appareil, de son compte Google ou fournisseur de connexion, de ses emails, de ses notifications et de son environnement de navigation.'
        ],
        items: [
          'Ne communiquez jamais votre PIN, même à une personne se présentant comme support Moni.io.',
          'Verrouillez votre téléphone et évitez les appareils partagés pour les opérations financières.',
          'Signalez immédiatement toute opération inconnue ou tout accès suspect.'
        ]
      },
      {
        title: 'Solde, dépôts et crédits portefeuille',
        body: [
          'Le solde affiché dans Moni.io représente l’état comptable du portefeuille utilisateur selon les données disponibles dans le système. Les dépôts peuvent dépendre de prestataires externes, de l’opérateur mobile, du réseau, du serveur de paiement, des confirmations de transaction et des contrôles antifraude. Un dépôt n’est considéré comme final dans Moni.io que lorsqu’il est confirmé et rapproché avec les données du partenaire concerné.',
          'Si un paiement externe est confirmé par un partenaire mais n’apparaît pas immédiatement dans Moni.io, l’utilisateur doit conserver les références de transaction et contacter le support. Moni.io peut corriger un crédit après rapprochement, y compris pour des transactions antérieures, lorsqu’une preuve technique fiable confirme que les fonds ont bien été reçus ou alloués.'
        ]
      },
      {
        title: 'Transferts, QR, liens de paiement et badge caisse',
        body: [
          'Les transferts Moni à Moni, paiements par QR code, liens de paiement et badges caisse permettent à un payeur d’identifier un bénéficiaire par numéro Moni, montant éventuel, devise éventuelle et référence optionnelle. Avant confirmation, le payeur doit vérifier le nom du bénéficiaire, le numéro Moni, le montant et le motif.',
          'Une opération confirmée par PIN ou biométrie peut être exécutée rapidement. Les erreurs de saisie, paiements au mauvais bénéficiaire, montants incorrects, paiements volontaires ou paiements déclenchés depuis un lien partagé relèvent d’abord de la responsabilité de l’utilisateur qui confirme. Moni.io peut assister à la recherche d’une solution, sans garantir l’annulation d’une transaction déjà exécutée.'
        ]
      },
      {
        title: 'Retraits, PayPal et comptes externes',
        body: [
          'Lorsque la fonctionnalité est disponible, l’utilisateur peut lier un compte PayPal ou renseigner un email PayPal pour demander un retrait. PayPal reste un service tiers avec ses propres règles, conditions, vérifications, limites, frais, délais, restrictions géographiques et décisions d’acceptation. Moni.io ne contrôle pas les décisions de PayPal et ne garantit pas que chaque retrait sera accepté.',
          'Un retrait peut être refusé, retardé ou placé en attente si le compte externe est incorrect, non vérifié, limité, non autorisé à recevoir des fonds, indisponible, soumis à vérification ou si la fonctionnalité Payouts du prestataire n’est pas active. Les frais, taux et délais doivent être vérifiés dans l’interface au moment de l’opération.'
        ]
      },
      {
        title: 'Paiement de factures et services tiers',
        body: [
          'Moni.io peut permettre de payer ou préparer le paiement de factures et services tels que télévision, électricité, eau, internet, abonnements ou autres services. L’utilisateur doit vérifier le fournisseur, le numéro client, le numéro de décodeur, l’offre, le montant, la devise et les références avant confirmation.',
          'Les fournisseurs tiers restent responsables de leurs offres, de l’activation du service, de la qualité du service, des délais de reconduction, des erreurs de numéro client et de toute règle commerciale qui leur est propre. Moni.io peut transmettre ou enregistrer l’ordre de paiement, mais ne garantit pas la prestation finale d’un fournisseur externe lorsque celui-ci refuse, retarde ou annule l’activation.'
        ]
      },
      {
        title: 'Frais, taux, limites et disponibilité',
        body: [
          'Des frais peuvent s’appliquer aux dépôts, retraits, conversions, paiements, transferts, liaisons de compte, services de partenaires, opérations internationales, chargebacks, annulations ou traitements manuels. Les frais applicables doivent être affichés dans l’interface ou dans une communication associée lorsque la fonctionnalité est finalisée.',
          'Les taux de conversion peuvent varier selon le marché, les fournisseurs, les coûts de règlement, la devise source, la devise cible, l’heure de l’opération et les marges applicables. Les limites de transaction peuvent dépendre du profil utilisateur, du statut de vérification, du pays, du risque, de la réglementation, du partenaire et de l’historique du compte.'
        ]
      },
      {
        title: 'Suspension, limitation et clôture',
        body: [
          'Moni.io peut limiter, suspendre ou clôturer un compte, bloquer une opération, demander des informations, retarder un paiement ou refuser un service en cas de suspicion de fraude, violation des conditions, risque opérationnel, demande d’autorité compétente, chargeback, activité inhabituelle, utilisation interdite, compte compromis ou non-respect des obligations de vérification.',
          'Lorsque cela est raisonnablement possible et autorisé, Moni.io informe l’utilisateur des mesures prises. Certaines informations peuvent toutefois être limitées pour des raisons de sécurité, de conformité, d’enquête, de prévention de la fraude ou d’obligation légale.'
        ]
      },
      {
        title: 'Responsabilité',
        body: [
          'Moni.io fournit une plateforme numérique avec des dépendances techniques et partenaires. Nous faisons des efforts raisonnables pour maintenir un service stable, sécurisé et cohérent, mais nous ne garantissons pas l’absence totale d’interruptions, d’erreurs, de retards, d’indisponibilités, d’échecs de réseau, de refus de tiers ou de pertes liées à une utilisation incorrecte.',
          'Dans les limites permises par la loi applicable, Moni.io et MboMa & Co. ne sont pas responsables des pertes indirectes, pertes d’opportunité, pertes commerciales, dommages de réputation, erreurs de bénéficiaire, compromission de l’appareil utilisateur, fraude causée par divulgation du PIN ou refus imposé par un prestataire externe.'
        ]
      },
      {
        title: 'Modifications des conditions',
        body: [
          'Ces conditions peuvent être modifiées pour refléter les évolutions de Moni.io, les nouvelles fonctionnalités, les changements de partenaires, les obligations légales, les exigences de sécurité ou les améliorations de clarté. La date de dernière mise à jour indique la version applicable.',
          'L’utilisation continue de Moni.io après publication d’une version mise à jour vaut acceptation des nouvelles conditions, sauf disposition contraire obligatoire. Si vous refusez une modification, vous devez cesser d’utiliser les services et demander les informations nécessaires à la clôture de votre compte.'
        ]
      }
    ]
  },
  {
    id: 'acceptable-use',
    title: 'Politique d’utilisation acceptable',
    shortTitle: 'Utilisation',
    summary: 'Règles de conduite, activités interdites et obligations de conformité.',
    effectiveDate: LEGAL_LAST_UPDATED,
    lastUpdated: LEGAL_LAST_UPDATED,
    publicPath: '/legal/politique-utilisation.html',
    sections: [
      {
        title: 'Principe général',
        body: [
          'Moni.io doit être utilisé uniquement pour des opérations licites, transparentes et conformes aux présentes règles. L’utilisateur s’interdit d’utiliser la plateforme pour contourner la loi, dissimuler l’origine des fonds, tromper un tiers, financer une activité interdite, exploiter une faille ou porter atteinte à la sécurité de la plateforme.',
          'Cette politique s’applique aux utilisateurs particuliers, marchands, agents, bénéficiaires de liens de paiement, payeurs, propriétaires de badges caisse, comptes professionnels et toute personne qui interagit avec un service Moni.io.'
        ]
      },
      {
        title: 'Activités interdites',
        body: [
          'Les activités suivantes sont interdites, qu’elles soient réalisées directement, indirectement, pour votre compte ou pour le compte d’un tiers. Moni.io peut bloquer une opération et demander des informations si une activité semble entrer dans une catégorie interdite.'
        ],
        items: [
          'Blanchiment de capitaux, financement du terrorisme, contournement de sanctions, fraude fiscale ou dissimulation de l’origine des fonds.',
          'Vente de biens volés, contrefaits, piratés, obtenus illégalement ou portant atteinte aux droits de propriété intellectuelle.',
          'Escroquerie, phishing, usurpation d’identité, arnaque sentimentale, fausse collecte, faux investissement, pyramide, Ponzi ou promesse trompeuse de rendement.',
          'Paiements liés à drogues illicites, armes interdites, trafic, exploitation humaine, violence, contenus sexuels illégaux, mineurs, haine ou intimidation.',
          'Jeux d’argent, paris, loteries, trading haut risque, crypto-actifs ou services financiers réglementés lorsque l’utilisateur n’a pas les autorisations nécessaires.',
          'Utilisation de comptes tiers, moyens de paiement volés, cartes compromises, comptes PayPal non autorisés, numéros de téléphone usurpés ou appareils compromis.',
          'Spam, génération massive de liens de paiement trompeurs, badge caisse imitant un autre marchand, QR code falsifié ou collecte mensongère.'
        ]
      },
      {
        title: 'Obligations des marchands et bénéficiaires',
        body: [
          'Un marchand ou bénéficiaire qui utilise un lien de paiement, QR code ou badge caisse doit afficher une identité claire, vendre des biens ou services licites, respecter les droits du consommateur, gérer ses remboursements, fournir les produits promis et répondre aux contestations de bonne foi.',
          'Le nom affiché, le numéro Moni, le montant, la référence et la description ne doivent pas induire le payeur en erreur. Un badge caisse ne doit pas être installé dans un lieu où l’utilisateur n’a pas l’autorisation de collecter des paiements.'
        ]
      },
      {
        title: 'Conformité et vérifications',
        body: [
          'Moni.io peut mettre en place des contrôles de conformité, de lutte contre la fraude, de sécurité, d’identité, de source des fonds, de comportement transactionnel et de cohérence des informations. Ces contrôles peuvent être automatiques ou manuels.',
          'L’utilisateur doit coopérer avec les demandes raisonnables de vérification. Le refus de fournir les informations nécessaires, la fourniture d’informations fausses ou l’utilisation de documents altérés peut entraîner une limitation du compte, le refus d’une transaction ou la clôture du compte.'
        ]
      },
      {
        title: 'Détection de risques et mesures de protection',
        body: [
          'Moni.io peut retarder, suspendre, rejeter ou examiner une transaction lorsqu’un signal de risque est détecté: montant inhabituel, fréquence anormale, incohérence de localisation, compte récent, bénéficiaire signalé, partenaire qui refuse la transaction, suspicion de chargeback, changement d’appareil ou tentative répétée de PIN.',
          'Ces mesures visent à protéger les utilisateurs et la plateforme. Elles ne constituent pas une accusation définitive et peuvent être levées après vérification satisfaisante.'
        ]
      },
      {
        title: 'Signalement',
        body: [
          'Tout utilisateur qui reçoit un lien suspect, constate une opération inconnue, pense avoir payé un mauvais bénéficiaire ou soupçonne une fraude doit contacter le support via l’application ou les canaux publiés par MboMa & Co. sur mboma.org.',
          'Le signalement doit inclure les références disponibles: numéro Moni, date, montant, capture d’écran, identifiant de transaction, numéro de téléphone, email PayPal, fournisseur concerné et description claire des faits.'
        ]
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Politique de confidentialité et données personnelles',
    shortTitle: 'Confidentialité',
    summary: 'Données collectées, finalités, conservation, sécurité, droits et partenaires.',
    effectiveDate: LEGAL_LAST_UPDATED,
    lastUpdated: LEGAL_LAST_UPDATED,
    publicPath: '/legal/confidentialite.html',
    sections: [
      {
        title: 'Responsable du service',
        body: [
          'Moni.io est un produit et une marque déposée de MboMa & Co. Cette politique explique comment Moni.io traite les données liées aux utilisateurs, payeurs, bénéficiaires, marchands, visiteurs des pages publiques et personnes qui interagissent avec les services.',
          'Lorsque Moni.io utilise des prestataires de paiement, d’authentification, d’hébergement, d’analyse, de messagerie, de notification ou de sécurité, ces prestataires peuvent traiter certaines données selon leurs propres politiques et selon les instructions ou obligations applicables.'
        ]
      },
      {
        title: 'Données que nous pouvons collecter',
        body: [
          'Les données collectées dépendent des fonctionnalités utilisées. Nous pouvons collecter les données fournies par l’utilisateur, les données générées par l’utilisation de la plateforme, les données nécessaires aux paiements et les données techniques nécessaires à la sécurité.',
          'Nous évitons de collecter les données non nécessaires au service. Certaines données sont toutefois indispensables pour créer un compte, protéger l’accès, exécuter une opération, conserver un historique, répondre à une contestation ou respecter une obligation de conformité.'
        ],
        items: [
          'Identité de compte: nom, email, photo de profil, identifiant utilisateur, numéro Moni, date de création.',
          'Sécurité: hash du PIN, état biométrique WebAuthn, identifiant technique d’authentificateur, dates de création et d’utilisation.',
          'Transactions: montants, devises, références, bénéficiaires, expéditeurs, statut, type d’opération, fournisseur, horodatage et métadonnées utiles au rapprochement.',
          'Paiements externes: téléphone mobile money, opérateur, email PayPal, état de liaison PayPal, références de prestataire et réponses techniques nécessaires au suivi.',
          'Appareil et usage: navigateur, type d’appareil, PWA installée ou non, logs techniques, erreurs, événements de sécurité et préférences.',
          'Support: messages, captures, références communiquées, demandes de correction ou contestation.'
        ]
      },
      {
        title: 'Finalités du traitement',
        body: [
          'Les données sont utilisées pour fournir le service Moni.io, exécuter les opérations demandées, afficher le solde, confirmer les paiements, générer des QR codes, créer des liens de paiement, gérer les retraits, traiter les dépôts, payer les factures, sécuriser l’application et répondre au support.',
          'Les données peuvent aussi être utilisées pour prévenir la fraude, détecter les anomalies, respecter les obligations de conformité, améliorer la performance, comprendre les fonctionnalités les plus utilisées, corriger les erreurs, informer l’utilisateur et documenter les opérations.'
        ]
      },
      {
        title: 'Bases et intérêts légitimes',
        body: [
          'Selon le pays et le cadre applicable, le traitement peut être fondé sur l’exécution du service demandé, le consentement, le respect d’une obligation légale, la sécurité de la plateforme, la prévention de la fraude, l’intérêt légitime à maintenir un service fiable ou la défense de droits en cas de litige.',
          'Lorsque le consentement est requis, par exemple pour certains cookies ou certaines communications non essentielles, l’utilisateur peut le refuser ou le retirer selon les moyens proposés.'
        ]
      },
      {
        title: 'Partage avec les partenaires',
        body: [
          'Certaines opérations nécessitent la transmission de données à des partenaires: prestataires de paiement, opérateurs mobile money, fournisseurs de factures, PayPal, services d’hébergement, Firebase/Google, fournisseurs de notification, services d’analyse, outils de sécurité et prestataires techniques.',
          'Les données partagées sont limitées à ce qui est nécessaire pour exécuter l’opération, confirmer le statut, assurer la sécurité, régler un litige ou satisfaire une obligation. Un partenaire peut refuser une transaction, demander une vérification ou appliquer ses propres conditions.'
        ]
      },
      {
        title: 'Conservation',
        body: [
          'Les données de compte sont conservées tant que le compte est actif et pendant une période raisonnable après clôture si cela est nécessaire pour la sécurité, les obligations légales, la prévention de la fraude, la gestion des contestations, la comptabilité ou la défense de droits.',
          'Les historiques de transaction peuvent être conservés plus longtemps que les préférences d’interface, car ils documentent les mouvements financiers, les confirmations et les rapprochements avec les prestataires. Les logs techniques sont conservés pour une durée adaptée à leur finalité.'
        ]
      },
      {
        title: 'Sécurité',
        body: [
          'Moni.io met en place des mesures techniques et organisationnelles raisonnables: authentification, PIN haché, biométrie WebAuthn lorsque disponible, verrouillage d’application, règles d’accès, surveillance des erreurs, séparation des secrets de production, journalisation et limitation des informations sensibles exposées côté client.',
          'Aucun système n’est totalement invulnérable. L’utilisateur doit protéger son appareil, son email, son compte de connexion, ses notifications, son PIN, son réseau et éviter de saisir ses informations sur des liens suspects.'
        ]
      },
      {
        title: 'Droits des utilisateurs',
        body: [
          'Selon le droit applicable, l’utilisateur peut demander l’accès à ses données, leur correction, leur suppression, une limitation, une opposition, une copie ou des informations sur les traitements. Certaines demandes peuvent être refusées ou différées lorsqu’une conservation est nécessaire pour des raisons légales, de sécurité, de transaction ou de litige.',
          'Les demandes doivent être transmises via les canaux de support de Moni.io ou de MboMa & Co. publiés dans l’application ou sur mboma.org. Pour éviter l’usurpation, Moni.io peut demander une vérification d’identité avant de répondre.'
        ]
      },
      {
        title: 'Transferts internationaux',
        body: [
          'Moni.io peut utiliser des prestataires ou infrastructures situés dans plusieurs pays. Les données peuvent donc être traitées hors du pays de résidence de l’utilisateur lorsque cela est nécessaire au service, à la sécurité, au paiement, à l’hébergement ou au support.',
          'Nous cherchons à utiliser des prestataires reconnus et à limiter les transferts au nécessaire. Les utilisateurs doivent aussi consulter les politiques des prestataires tiers lorsqu’ils utilisent PayPal, Google, Firebase, MaxiCash ou d’autres services associés.'
        ]
      }
    ]
  },
  {
    id: 'cookies',
    title: 'Politique de cookies et traceurs',
    shortTitle: 'Cookies',
    summary: 'Utilisation des cookies, stockage local, PWA, consentement et préférences.',
    effectiveDate: LEGAL_LAST_UPDATED,
    lastUpdated: LEGAL_LAST_UPDATED,
    publicPath: '/legal/cookies.html',
    sections: [
      {
        title: 'Définition',
        body: [
          'Les cookies et traceurs sont des technologies qui permettent à un site ou une application web de stocker ou lire des informations sur un appareil: cookies HTTP, localStorage, sessionStorage, IndexedDB, cache PWA, service worker, identifiants de session, préférences et outils de mesure.',
          'Moni.io utilise ces technologies pour faire fonctionner l’application, garder certaines préférences, sécuriser l’accès, améliorer l’expérience PWA, conserver le choix de devise, mémoriser l’onboarding, faciliter les pages publiques et maintenir une expérience stable.'
        ]
      },
      {
        title: 'Traceurs nécessaires',
        body: [
          'Certains traceurs sont nécessaires au fonctionnement de Moni.io. Ils permettent notamment la connexion, la sécurité, le verrouillage de l’application, la conservation de préférences essentielles, le cache PWA, l’affichage hors ligne de certaines ressources et la prévention d’erreurs répétées.',
          'Ces traceurs ne sont pas utilisés pour vendre les données personnelles. Sans eux, certaines fonctionnalités ne peuvent pas fonctionner correctement ou l’expérience peut être dégradée.'
        ],
        items: [
          'Préférences locales comme devise choisie, langue, onboarding et état d’installation.',
          'Cache technique de l’application web progressive pour accélérer l’ouverture.',
          'Données temporaires de session nécessaires à l’authentification et à la sécurité.',
          'Stockage technique des réglages de notification ou de consentement lorsque la fonctionnalité est activée.'
        ]
      },
      {
        title: 'Mesure, amélioration et diagnostic',
        body: [
          'Moni.io peut utiliser des outils de mesure ou diagnostic pour comprendre les erreurs, les performances, les fonctionnalités les plus utilisées, les échecs de chargement et les problèmes de compatibilité. Lorsque la réglementation exige un consentement, Moni.io doit permettre à l’utilisateur de refuser les traceurs non essentiels.',
          'Les données de diagnostic doivent être utilisées pour améliorer la stabilité, la sécurité, la rapidité, la compatibilité mobile, l’expérience PWA et les parcours critiques comme dépôt, retrait, paiement QR, PayPal, factures et transferts.'
        ]
      },
      {
        title: 'Cookies tiers',
        body: [
          'Des tiers peuvent déposer ou lire des traceurs lorsque leurs services sont intégrés: Google/Firebase pour l’authentification ou l’infrastructure, PayPal pour les parcours PayPal, prestataires de paiement, fournisseurs de polices ou services de sécurité. Ces tiers peuvent appliquer leurs propres politiques.',
          'Moni.io ne contrôle pas entièrement les traceurs placés directement par un service tiers lorsque l’utilisateur interagit avec ce service. L’utilisateur doit consulter les politiques du tiers concerné.'
        ]
      },
      {
        title: 'Gestion des préférences',
        body: [
          'L’utilisateur peut supprimer les cookies et données locales via les paramètres de son navigateur. Sur une PWA installée, il peut aussi supprimer les données du site, désinstaller l’application, vider le cache ou gérer les autorisations accordées au navigateur.',
          'Supprimer les données locales peut déconnecter l’utilisateur, réinitialiser certaines préférences, relancer l’onboarding, supprimer le cache PWA ou demander une nouvelle autorisation. Les données de transaction conservées côté serveur ne sont pas supprimées par le simple effacement des cookies.'
        ]
      },
      {
        title: 'Consentement',
        body: [
          'Lorsque des cookies non essentiels sont utilisés, Moni.io doit demander un consentement clair, permettre le refus lorsque la loi l’exige et fournir une option de retrait. Les choix de consentement peuvent être conservés pour éviter de redemander la même décision à chaque visite.',
          'Les cookies strictement nécessaires à la fourniture du service, à la sécurité ou à la demande explicite de l’utilisateur peuvent être utilisés sans consentement additionnel lorsque la réglementation applicable le permet.'
        ]
      }
    ]
  }
];

export const getLegalDocument = (id: LegalDocumentId) =>
  legalDocuments.find((document) => document.id === id) || legalDocuments[0];
