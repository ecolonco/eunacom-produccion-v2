import crypto from 'crypto';
import { logger } from '../utils/logger';

type FlowParams = Record<string, string | number | boolean | undefined>;

export interface CreatePaymentParams {
  commerceOrder: string; // id de nuestra orden/pago
  amount: number; // CLP
  subject: string;
  email: string;
  urlReturn: string;
  urlConfirmation: string;
}

export interface CreatePaymentResult {
  token: string;
  url: string;
  flowOrder?: string;
}

export class FlowService {
  private static getConfig() {
    const apiKey = process.env.FLOW_API_KEY || '';
    const apiSecret = process.env.FLOW_API_SECRET || '';
    const commerceId = process.env.FLOW_COMMERCE_ID || '';
    let base = (process.env.FLOW_API_BASE || 'sandbox').trim();
    // Normalizar valores comunes
    if (!/^https?:\/\//i.test(base)) {
      const v = base.toLowerCase();
      if (v.includes('sandbox')) base = 'https://sandbox.flow.cl/api';
      else base = 'https://www.flow.cl/api';
    }
    const apiBase = base.replace(/\/$/, '');
    if (!apiKey || !apiSecret) {
      logger.warn('FLOW API not fully configured');
    }
    return { apiKey, apiSecret, apiBase, commerceId };
  }

  private static buildSignature(params: FlowParams, secret: string): string {
    // Firma HMAC-SHA256 sobre los parámetros ordenados (formato querystring)
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return crypto.createHmac('sha256', secret).update(sorted).digest('hex');
  }

  private static async post<T>(endpoint: string, body: FlowParams): Promise<T> {
    const { apiKey, apiSecret, apiBase, commerceId } = this.getConfig();
    const params: FlowParams = { ...body, apiKey, apikey: apiKey };
    if (commerceId) params['commerceId'] = commerceId;
    const s = this.buildSignature(params, apiSecret);
    // Flow espera x-www-form-urlencoded
    const usp = new URLSearchParams();
    Object.keys(params)
      .filter((k) => params[k] !== undefined)
      .forEach((k) => usp.append(k, String(params[k])));
    usp.append('s', s);
    const url = `${apiBase}${endpoint}`;
    const urlWithKey = `${url}?apiKey=${encodeURIComponent(String(apiKey))}`;
    logger.info('Flow createPayment request', {
      endpoint,
      url: urlWithKey,
      hasApiKey: Boolean(apiKey),
      bodyKeys: Object.keys(params),
    });
    const resp = await fetch(urlWithKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Algunos entornos de Flow aceptan apiKey por cabecera
        'apiKey': String(apiKey),
        'X-Api-Key': String(apiKey),
        'Accept': 'application/json',
      },
      body: usp.toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      logger.error('Flow API error', { endpoint, status: resp.status, text });
      throw new Error(`Flow API error ${resp.status}`);
    }
    return (await resp.json()) as T;
  }

  static async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const payload: FlowParams = {
      commerceOrder: params.commerceOrder,
      subject: params.subject,
      amount: params.amount,
      currency: 'CLP',
      email: params.email,
      urlReturn: params.urlReturn,
      urlConfirmation: params.urlConfirmation,
      paymentMethod: 9, // Todos los medios de pago
    };
    const result = await this.post<any>('/payment/create', payload);
    // Flow suele retornar token y url
    return { token: result.token || result.flowToken, url: result.url || result.payUrl, flowOrder: result.flowOrder };
  }

  static verifySignatureFromHeaders(rawBody: string, signatureHeader?: string): boolean {
    // Algunas integraciones envían firma en header 'X-Flow-Signature' con HMAC del rawBody
    if (!signatureHeader) return false;
    const { apiSecret } = this.getConfig();
    const computed = crypto.createHmac('sha256', apiSecret).update(rawBody).digest('hex');
    const ok = computed === signatureHeader;
    if (!ok) logger.warn('Invalid Flow webhook signature');
    return ok;
  }
}


