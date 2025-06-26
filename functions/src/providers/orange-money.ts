// src/providers/orange-money.ts
// Orange Money API Integration

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { ORANGE_MONEY_CONFIG, API_CONFIG } from '../config';

interface OrangeMoneyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface OrangeMoneyPaymentRequest {
  amount: number;
  currency: string;
  order_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  lang: string;
  reference: string;
  phone?: string;
}

interface OrangeMoneyPaymentResponse {
  order_id: string;
  pay_token: string;
  payment_url: string;
  status: string;
  message?: string;
}

interface OrangeMoneyPaymentStatus {
  order_id: string;
  status: string;
  amount?: number;
  currency?: string;
  message?: string;
}

export class OrangeMoneyProvider {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: ORANGE_MONEY_CONFIG.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      if (config.url && !config.url.includes('/oauth/token')) {
        await this.ensureValidToken();
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.accessToken) {
          // Token expired, clear it and retry
          this.accessToken = null;
          this.tokenExpiry = 0;
          // Retry the request once
          const originalRequest = error.config;
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            await this.ensureValidToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response: AxiosResponse<OrangeMoneyToken> = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: ORANGE_MONEY_CONFIG.clientId,
        client_secret: ORANGE_MONEY_CONFIG.clientSecret,
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error: any) {
      console.error('Orange Money token error:', error.response?.data || error.message);
      throw new Error(`Failed to get Orange Money access token: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.getAccessToken();
    }
  }

  /**
   * Initiate a payment
   */
  async initiatePayment(params: {
    amount: number;
    currency: string;
    phone: string;
    metadata: any;
    transactionId: string;
  }): Promise<{
    provider: string;
    redirect_url: string;
    status: string;
    amount: number;
    currency: string;
    phone: string;
    metadata: any;
    order_id: string;
  }> {
    try {
      const { amount, currency, phone, metadata, transactionId } = params;

      // Create return URLs
      const baseUrl = process.env.FUNCTIONS_EMULATOR 
        ? 'http://localhost:5001/mobys-api/us-central1/mobysApi'
        : `https://${ORANGE_MONEY_CONFIG.environment === 'production' ? 'us-central1' : 'us-central1'}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mobysApi`;

      const returnUrl = `${baseUrl}/webhook/payment`;
      const cancelUrl = `${baseUrl}/webhook/payment`;
      const notifyUrl = `${baseUrl}/webhook/payment`;

      const paymentRequest: OrangeMoneyPaymentRequest = {
        amount,
        currency,
        order_id: transactionId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        lang: 'fr',
        reference: metadata?.order_id || transactionId,
        phone: phone.replace('+', ''), // Remove + prefix for Orange Money
      };

      console.log('Orange Money payment request:', JSON.stringify(paymentRequest, null, 2));

      const response: AxiosResponse<OrangeMoneyPaymentResponse> = await this.client.post(
        '/om-wapg/v1/transaction/init',
        paymentRequest
      );

      console.log('Orange Money payment response:', JSON.stringify(response.data, null, 2));

      if (response.data.status !== 'SUCCESS') {
        throw new Error(`Orange Money payment initiation failed: ${response.data.message || 'Unknown error'}`);
      }

      return {
        provider: 'orange_money',
        redirect_url: response.data.payment_url,
        status: 'pending',
        amount,
        currency,
        phone,
        metadata: metadata || {},
        order_id: response.data.order_id,
      };
    } catch (error: any) {
      console.error('Orange Money payment initiation error:', error.response?.data || error.message);
      throw new Error(`Orange Money payment failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(orderId: string): Promise<OrangeMoneyPaymentStatus> {
    try {
      const response: AxiosResponse<OrangeMoneyPaymentStatus> = await this.client.get(
        `/om-wapg/v1/transaction/status/${orderId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('Orange Money status check error:', error.response?.data || error.message);
      throw new Error(`Failed to check Orange Money payment status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify webhook signature using HMAC
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // In sandbox mode, accept all webhooks for testing
      if (ORANGE_MONEY_CONFIG.environment === 'sandbox') {
        console.log('Orange Money: Sandbox mode - accepting webhook without signature verification');
        return true;
      }

      // In production, verify the signature
      if (!ORANGE_MONEY_CONFIG.webhookSecret) {
        console.error('Orange Money: Webhook secret not configured');
        return false;
      }

      if (!signature) {
        console.error('Orange Money: No signature provided in webhook');
        return false;
      }

      // Create HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', ORANGE_MONEY_CONFIG.webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      console.log('Orange Money webhook signature verification:', {
        provided: signature,
        expected: expectedSignature,
        isValid
      });

      return isValid;
    } catch (error) {
      console.error('Orange Money webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse webhook payload with enhanced error handling
   */
  parseWebhookPayload(body: any, query: any): {
    transaction_id: string;
    status: string;
    amount?: number;
    currency?: string;
    message?: string;
  } {
    try {
      // Handle GET request (redirect from Orange Money)
      if (query && query.order_id) {
        return {
          transaction_id: query.order_id,
          status: query.status || 'unknown',
          message: query.message || query.description,
        };
      }

      // Handle POST request (webhook notification)
      if (body && body.order_id) {
        return {
          transaction_id: body.order_id,
          status: body.status || 'unknown',
          amount: body.amount,
          currency: body.currency,
          message: body.message || body.description,
        };
      }

      throw new Error('Invalid Orange Money webhook payload format');
    } catch (error: any) {
      console.error('Orange Money webhook parsing error:', error);
      throw new Error(`Failed to parse Orange Money webhook: ${error.message}`);
    }
  }
}

// Export singleton instance
export const orangeMoneyProvider = new OrangeMoneyProvider(); 