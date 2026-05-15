import {
  commitWrites,
  createFirestoreId,
  getDocument,
  getFirebaseAuthContext,
  incrementWrite,
  updateWrite,
} from '../../_lib/firestore';
import {
  checkMaxiCashPaymentStatusByReference,
  extractMaxiCashStatus,
  getMaxiCashErrorMessage,
  hasCompletedMaxiCashPayment,
  hasFailedMaxiCashPayment,
  isImmediateMaxiCashFailure,
} from '../../_lib/maxicash';

type ApiRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: any) => void; end: () => void };
};

const FAIL_AFTER_MS = 15 * 60 * 1000;

async function readJsonBody(req: ApiRequest) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function sendMethodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', ['POST', 'OPTIONS']);
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}

function getProviderTransactionId(payload: Record<string, any> | null | undefined, fallback?: string | null) {
  return String(payload?.TransactionID || payload?.transactionID || payload?.TransactionId || payload?.transactionId || fallback || '') || null;
}

function getTransactionAgeMs(transaction: Record<string, any>) {
  const timestamp = transaction.timestamp;
  if (timestamp instanceof Date) return Date.now() - timestamp.getTime();
  if (timestamp) return Date.now() - new Date(String(timestamp)).getTime();
  if (transaction.createdAt) return Date.now() - new Date(String(transaction.createdAt)).getTime();
  return 0;
}

async function creditCompletedDeposit(params: {
  token: string;
  uid: string;
  transactionId: string;
  transactionPath: string;
  transactionUpdateTime?: string;
  transaction: Record<string, any>;
  statusPayload: Record<string, any> | null;
  status: string;
  providerTransactionId: string | null;
  amountToCredit: number;
  walletCurrency: string;
}) {
  const now = new Date();
  const userPath = `users/${params.uid}`;
  const metadata = {
    ...(params.transaction.metadata || {}),
    statusCheckPayload: params.statusPayload || null,
    statusCheckStatus: params.status || null,
    providerTransactionId: params.providerTransactionId,
    lastCheckedAt: now,
    completionVerified: true,
  };
  const notificationId = createFirestoreId('notif-');

  await commitWrites(
    [
      incrementWrite(userPath, 'balance', params.amountToCredit, {
        currency: params.walletCurrency,
        preferredCurrency: params.walletCurrency,
        lastTransactionTime: now,
      }),
      updateWrite(
        params.transactionPath,
        {
          status: 'completed',
          description: `Confirmé via ${params.transaction.metadata?.operatorLabel || 'Mobile Money'}`,
          updatedAt: now,
          completedAt: now,
          creditedAt: now,
          metadata,
        },
        params.transactionUpdateTime ? { updateTime: params.transactionUpdateTime } : undefined
      ),
      updateWrite(
        `notifications/${notificationId}`,
        {
          userId: params.uid,
          type: 'deposit-completed',
          title: 'Dépôt confirmé',
          message: `${params.amountToCredit.toLocaleString()} ${params.walletCurrency} ajoutés à votre portefeuille.`,
          amount: params.amountToCredit,
          timestamp: now,
          read: false,
          actionRequired: false,
          transactionId: params.transactionId,
        },
        { exists: false }
      ),
    ],
    params.token
  );
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const transactionId = String(body.transactionId || '').trim();

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'Transaction introuvable.' });
    }

    const transactionPath = `transactions/${transactionId}`;
    const transactionSnap = await getDocument(transactionPath, auth.token);

    if (!transactionSnap.exists) {
      return res.status(404).json({ success: false, error: 'Transaction introuvable.' });
    }

    const transaction = transactionSnap.data;
    if (transaction.userId !== auth.uid) {
      return res.status(403).json({ success: false, error: 'Accès refusé.' });
    }

    if (transaction.type !== 'deposit' || transaction.metadata?.provider !== 'maxicash') {
      return res.status(400).json({ success: false, error: 'Cette transaction n’est pas un dépôt Mobile Money.' });
    }

    const amountToCredit = Number(transaction.amount || transaction.metadata?.creditedAmount || 0);
    const walletCurrency = String(transaction.metadata?.walletCurrency || 'USD');

    if (transaction.status === 'completed') {
      return res.status(200).json({
        success: true,
        transactionStatus: 'completed',
        transactionId,
        creditedAmount: amountToCredit,
        walletCurrency,
        message: 'Dépôt déjà confirmé.',
      });
    }

    const reference = String(transaction.reference || transaction.metadata?.reference || '').trim();
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Référence MaxiCash manquante.' });
    }

    const previousProviderTransactionId =
      transaction.metadata?.providerTransactionId || transaction.metadata?.providerPayload?.TransactionID || null;
    const statusPayload = await checkMaxiCashPaymentStatusByReference(reference, previousProviderTransactionId);
    const providerTransactionId = getProviderTransactionId(statusPayload, previousProviderTransactionId);
    const status = extractMaxiCashStatus(statusPayload);
    const providerError = getMaxiCashErrorMessage(statusPayload, '');
    const ageMs = getTransactionAgeMs(transaction);

    if (hasCompletedMaxiCashPayment(statusPayload)) {
      try {
        await creditCompletedDeposit({
          token: auth.token,
          uid: auth.uid,
          transactionId,
          transactionPath,
          transactionUpdateTime: transactionSnap.updateTime,
          transaction,
          statusPayload,
          status,
          providerTransactionId,
          amountToCredit,
          walletCurrency,
        });
      } catch (error: any) {
        const latest = await getDocument(transactionPath, auth.token);
        if (latest.data.status !== 'completed') throw error;
      }

      return res.status(200).json({
        success: true,
        transactionStatus: 'completed',
        transactionId,
        reference,
        providerTransactionId,
        responseStatus: status,
        error: '',
        message: 'Dépôt confirmé.',
        creditedAmount: amountToCredit,
        walletCurrency,
        providerResponse: statusPayload,
      });
    }

    const now = new Date();
    const metadata = {
      ...(transaction.metadata || {}),
      statusCheckPayload: statusPayload || null,
      statusCheckStatus: status || null,
      providerTransactionId,
      lastCheckedAt: now,
      providerError: providerError || null,
    };

    if (hasFailedMaxiCashPayment(statusPayload, status)) {
      const shouldFail = isImmediateMaxiCashFailure(statusPayload, status) || ageMs >= FAIL_AFTER_MS;
      await commitWrites(
        [
          updateWrite(
            transactionPath,
            {
              status: shouldFail ? 'failed' : 'pending',
              description: shouldFail
                ? `Échec: ${providerError || 'paiement refusé'}`
                : 'Confirmez le paiement sur votre téléphone',
              updatedAt: now,
              failedAt: shouldFail ? now : undefined,
              metadata,
            },
            transactionSnap.updateTime ? { updateTime: transactionSnap.updateTime } : undefined
          ),
        ],
        auth.token
      );

      return res.status(shouldFail ? 502 : 200).json({
        success: !shouldFail,
        transactionStatus: shouldFail ? 'failed' : 'pending',
        transactionId,
        reference,
        providerTransactionId,
        responseStatus: status,
        error: shouldFail ? providerError || 'Paiement refusé.' : '',
        message: shouldFail ? 'Paiement refusé.' : 'Paiement en attente de confirmation.',
        creditedAmount: amountToCredit,
        walletCurrency,
        providerResponse: statusPayload,
      });
    }

    await commitWrites(
      [
        updateWrite(
          transactionPath,
          {
            status: 'pending',
            description: 'Confirmez le paiement sur votre téléphone',
            updatedAt: now,
            metadata,
          },
          transactionSnap.updateTime ? { updateTime: transactionSnap.updateTime } : undefined
        ),
      ],
      auth.token
    );

    return res.status(200).json({
      success: true,
      transactionStatus: 'pending',
      transactionId,
      reference,
      providerTransactionId,
      responseStatus: status,
      error: '',
      message: 'Paiement en attente de confirmation.',
      creditedAmount: amountToCredit,
      walletCurrency,
      providerResponse: statusPayload,
    });
  } catch (error: any) {
    console.error('MaxiCash deposit status error:', error);
    const message = error?.message || 'Impossible de vérifier le dépôt.';
    const status = message.includes('Non authentifié') ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}
