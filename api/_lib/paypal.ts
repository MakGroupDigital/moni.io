export type PayPalEnvironment = 'sandbox' | 'live';

export interface PayPalConfig {
  env: PayPalEnvironment;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  apiBaseUrl: string;
}

export class PayPalApiError extends Error {
  status: number;
  debugId?: string;
  errorName?: string;
  details?: string;
  payload?: Record<string, any> | null;

  constructor(message: string, options: {
    status: number;
    debugId?: string;
    errorName?: string;
    details?: string;
    payload?: Record<string, any> | null;
  }) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = options.status;
    this.debugId = options.debugId;
    this.errorName = options.errorName;
    this.details = options.details;
    this.payload = options.payload;
  }
}

function normalizeEnv(value: unknown): PayPalEnvironment {
  return String(value || '').toLowerCase() === 'live' ? 'live' : 'sandbox';
}

export function getPayPalConfig(req?: { headers?: Record<string, string | string[] | undefined> }): PayPalConfig {
  const env = normalizeEnv(process.env.PAYPAL_ENV);
  const apiBaseUrl = env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const authorizeUrl = env === 'live' ? 'https://www.paypal.com/signin/authorize' : 'https://www.sandbox.paypal.com/signin/authorize';
  const hostHeader = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const protocolHeader = req?.headers?.['x-forwarded-proto'];
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader;
  const inferredOrigin = host ? `${protocol || 'https'}://${host}` : 'http://localhost:3000';

  return {
    env,
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    redirectUri: process.env.PAYPAL_REDIRECT_URI || `${inferredOrigin}/paypal/callback`,
    authorizeUrl,
    apiBaseUrl,
  };
}

export function assertPayPalConfig(config: PayPalConfig) {
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Configuration PayPal manquante: PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET requis.');
  }
}

export async function exchangePayPalCode(config: PayPalConfig, code: string) {
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Erreur PayPal ${response.status}`);
  }

  return payload as { access_token: string; token_type?: string; expires_in?: number };
}

export async function getPayPalAccessToken(config: PayPalConfig) {
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Erreur PayPal ${response.status}`);
  }

  return payload as { access_token: string; token_type?: string; expires_in?: number };
}

export async function fetchPayPalUserInfo(config: PayPalConfig, accessToken: string) {
  const response = await fetch(`${config.apiBaseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Erreur PayPal ${response.status}`);
  }

  return payload as Record<string, any>;
}

export async function createPayPalPayout(params: {
  config: PayPalConfig;
  accessToken: string;
  senderBatchId: string;
  receiver: string;
  amount: number;
  currency: string;
  note: string;
}) {
  const response = await fetch(`${params.config.apiBaseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'PayPal-Request-Id': params.senderBatchId,
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: params.senderBatchId,
        email_subject: 'Votre retrait Moni est en cours',
        email_message: 'Moni a envoyé un retrait vers votre compte PayPal.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: params.amount.toFixed(2),
            currency: params.currency,
          },
          note: params.note,
          sender_item_id: `${params.senderBatchId}-item`,
          receiver: params.receiver,
          notification_language: 'fr-FR',
        },
      ],
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details = Array.isArray(payload?.details)
      ? payload.details.map((detail: any) => detail?.issue || detail?.description).filter(Boolean).join(' / ')
      : '';
    const debugId = payload?.debug_id || response.headers.get('paypal-debug-id') || undefined;
    const errorName = payload?.name || payload?.error || undefined;
    const rawMessage = details || payload?.message || payload?.name || `Erreur PayPal ${response.status}`;
    const isAuthorizationError = response.status === 403 ||
      String(payload?.name || '').includes('AUTHORIZATION') ||
      String(rawMessage).toLowerCase().includes('authorization');

    if (isAuthorizationError) {
      throw new PayPalApiError(
        'PayPal refuse ce retrait: le token contient le scope Payouts, mais le compte marchand ou l’application Live n’est pas autorisé à exécuter les Payouts API pour ce compte.',
        {
          status: response.status,
          debugId,
          errorName,
          details,
          payload,
        }
      );
    }

    throw new PayPalApiError(rawMessage, {
      status: response.status,
      debugId,
      errorName,
      details,
      payload,
    });
  }

  return payload as Record<string, any>;
}
