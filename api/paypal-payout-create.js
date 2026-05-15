const {
  sendJson,
  sendNoContent,
  readJsonBody,
  getFirebaseAuthContext,
  getDocument,
  commitWrites,
  updateWrite,
  incrementWrite,
  createFirestoreId,
  normalizeWalletCurrency,
} = require('./_lib/server.cjs');

function sendMethodNotAllowed(res) {
  res.setHeader?.('Allow', ['POST', 'OPTIONS']);
  return sendJson(res, 405, { success: false, error: 'Méthode non autorisée.' });
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const receiverEmail = String(body.receiverEmail || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { success: false, error: 'Montant invalide.' });
    }

    if (!receiverEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
      return sendJson(res, 400, { success: false, error: 'Compte PayPal invalide.' });
    }

    const userPath = `users/${auth.uid}`;
    const userSnap = await getDocument(userPath, auth.token);
    if (!userSnap.exists) {
      return sendJson(res, 404, { success: false, error: 'Utilisateur introuvable.' });
    }

    const userData = userSnap.data;
    const balance = Number(userData.balance || 0);
    const walletCurrency = normalizeWalletCurrency(body.currency || userData.preferredCurrency || userData.currency);

    if (balance < amount) {
      return sendJson(res, 400, { success: false, error: 'Solde insuffisant.' });
    }

    const now = new Date();
    const transactionId = createFirestoreId('paypal-wth-');
    const notificationId = createFirestoreId('notif-');
    const reference = `MONI-PAYPAL-${Date.now()}-${auth.uid.slice(0, 8)}`;

    await commitWrites(
      [
        incrementWrite(userPath, 'balance', -amount, {
          lastTransactionTime: now,
        }),
        updateWrite(
          `transactions/${transactionId}`,
          {
            userId: auth.uid,
            type: 'withdraw',
            amount,
            status: 'pending',
            timestamp: now,
            title: 'Retrait PayPal',
            description: `Traitement manuel vers ${receiverEmail}`,
            icon: 'fab fa-paypal',
            color: '#0070BA',
            reference,
            metadata: {
              provider: 'paypal',
              integration: 'manual-review',
              receiverEmail,
              walletAmount: amount,
              walletCurrency,
              manualProcessing: true,
              requestedAt: now.toISOString(),
            },
          },
          { exists: false }
        ),
        updateWrite(
          `notifications/${notificationId}`,
          {
            userId: auth.uid,
            type: 'withdraw-completed',
            title: 'Retrait PayPal en traitement',
            message: `${amount} ${walletCurrency} vers ${receiverEmail}. Traitement manuel par Moni.`,
            amount,
            timestamp: now,
            read: false,
            actionRequired: false,
            transactionId,
          },
          { exists: false }
        ),
      ],
      auth.token
    );

    return sendJson(res, 200, {
      success: true,
      transactionId,
      transactionStatus: 'pending',
      provider: 'paypal',
      processingMode: 'manual-review',
      walletAmount: amount,
      walletCurrency,
      receiverEmail,
      message: 'Demande PayPal enregistrée. Elle sera traitée manuellement.',
    });
  } catch (error) {
    console.error('PayPal manual withdrawal error:', error);
    const message = error?.message || 'Impossible d’enregistrer le retrait PayPal.';
    const status = message.includes('Non authentifié') ? 401 : 500;
    return sendJson(res, status, {
      success: false,
      error: message,
      provider: 'paypal',
    });
  }
}

module.exports = handler;
