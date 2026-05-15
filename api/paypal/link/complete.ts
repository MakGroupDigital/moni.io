import type { ApiRequest, ApiResponse } from '../../_lib/http';
import { sendJson, sendNoContent } from '../../_lib/http';
import { commitWrites, getDocument, getFirebaseAuthContext, updateWrite } from '../../_lib/firestore';
import { assertPayPalConfig, exchangePayPalCode, fetchPayPalUserInfo, getPayPalConfig } from '../../_lib/paypal';

async function readJsonBody(req: ApiRequest) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function sendMethodNotAllowed(res: ApiResponse) {
  res.setHeader?.('Allow', ['POST', 'OPTIONS']);
  return sendJson(res, 405, { success: false, error: 'Méthode non autorisée.' });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const code = String(body.code || '');
    const state = String(body.state || '');

    if (!code || !state) {
      return sendJson(res, 400, { success: false, error: 'Code PayPal ou état manquant.' });
    }

    const statePath = `paypalLinkStates/${state}`;
    const stateSnap = await getDocument(statePath, auth.token);
    if (!stateSnap.exists || stateSnap.data.uid !== auth.uid) {
      return sendJson(res, 400, { success: false, error: 'Session PayPal invalide.' });
    }

    if (stateSnap.data.status === 'linked') {
      return sendJson(res, 200, { success: true, paypalEmail: stateSnap.data.paypalEmail || null });
    }

    const config = getPayPalConfig(req);
    assertPayPalConfig(config);
    const token = await exchangePayPalCode(config, code);
    const profile = await fetchPayPalUserInfo(config, token.access_token);
    const paypalEmail = String(profile.email || profile.emails?.[0]?.value || '');
    const paypalPayerId = String(profile.user_id || profile.payer_id || profile.sub || '');

    if (!paypalEmail && !paypalPayerId) {
      throw new Error('PayPal n’a pas retourné les informations du compte.');
    }

    const now = new Date();
    await commitWrites(
      [
        updateWrite(`users/${auth.uid}`, {
          paypalLinked: true,
          paypalEmail: paypalEmail || null,
          paypalPayerId: paypalPayerId || null,
          paypalLinkedAt: now,
        }),
        updateWrite(
          statePath,
          {
            status: 'linked',
            paypalEmail: paypalEmail || null,
            paypalPayerId: paypalPayerId || null,
            linkedAt: now,
          },
          stateSnap.updateTime ? { updateTime: stateSnap.updateTime } : undefined
        ),
      ],
      auth.token
    );

    return sendJson(res, 200, {
      success: true,
      paypalEmail,
      paypalPayerId,
    });
  } catch (error: any) {
    console.error('PayPal link complete error:', error);
    const message = error?.message || 'Impossible de finaliser la liaison PayPal.';
    const status = message.includes('Non authentifié') ? 401 : 500;
    return sendJson(res, status, { success: false, error: message });
  }
}
