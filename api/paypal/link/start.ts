import { createFirestoreId, getFirebaseAuthContext, saveDocument } from '../../_lib/firestore';
import { assertPayPalConfig, getPayPalConfig } from '../../_lib/paypal';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: any) => void; end: () => void };
};

function sendMethodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', ['POST', 'OPTIONS']);
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
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

    return res.status(200).json({
      success: true,
      approvalUrl: `${config.authorizeUrl}?${params.toString()}`,
      state,
    });
  } catch (error: any) {
    console.error('PayPal link start error:', error);
    const message = error?.message || 'Impossible de démarrer la liaison PayPal.';
    const status = message.includes('Non authentifié') ? 401 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}
