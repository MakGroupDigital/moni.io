import type { ApiRequest, ApiResponse } from '../../_lib/http';
import { sendJson, sendNoContent } from '../../_lib/http';
import { createFirestoreId, getFirebaseAuthContext, saveDocument } from '../../_lib/firestore';
import { assertPayPalConfig, getPayPalConfig } from '../../_lib/paypal';

function sendMethodNotAllowed(res: ApiResponse) {
  res.setHeader?.('Allow', ['POST', 'OPTIONS']);
  return sendJson(res, 405, { success: false, error: 'Méthode non autorisée.' });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const auth = getFirebaseAuthContext(req);
    const config = getPayPalConfig(req);
    assertPayPalConfig(config);

    const state = createFirestoreId('pp-');
    await saveDocument(
      `paypalLinkStates/${state}`,
      {
        uid: auth.uid,
        status: 'created',
        env: config.env,
        redirectUri: config.redirectUri,
        createdAt: new Date(),
      },
      auth.token,
      { exists: false }
    );

    const params = new URLSearchParams({
      flowEntry: 'static',
      client_id: config.clientId,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: config.redirectUri,
      state,
    });

    return sendJson(res, 200, {
      success: true,
      approvalUrl: `${config.authorizeUrl}?${params.toString()}`,
      state,
    });
  } catch (error: any) {
    console.error('PayPal link start error:', error);
    const message = error?.message || 'Impossible de démarrer la liaison PayPal.';
    const status = message.includes('Non authentifié') ? 401 : 500;
    return sendJson(res, status, { success: false, error: message });
  }
}
