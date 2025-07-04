// src/providers/wave.ts
// Wave API Integration

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { WAVE_CONFIG, API_CONFIG } from '../config';

interface WavePaymentRequest {
  amount: number;
  currency: string;
  business_id: string;
  phone: string;
  description?: string;
  reference?: string;
  callback_url?: string;
  metadata?: any;
}

interface WavePaymentResponse {
  id: string;
  business_id: string;
  amount: number;
  currency: string;
  phone: string;
  status: string;
  description?: string;
  reference?: string;
  short_url?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface WavePaymentStatus {
  id: string;
  business_id: string;
  amount: number;
  currency: string;
  phone: string;
  status: string;
  description?: string;
  reference?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export class WaveProvider {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: WAVE_CONFIG.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${WAVE_CONFIG.apiKey}`,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        console.error('Wave API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
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
    short_url: string;
    status: string;
    amount: number;
    currency: string;
    phone: string;
    metadata: any;
    wave_id: string;
  }> {
    try {
      const { amount, currency, phone, metadata, transactionId } = params;

      // Create callback URL
      const baseUrl = process.env.FUNCTIONS_EMULATOR 
        ? 'http://localhost:5001/mobys-api/us-central1/mobysApi'
        : `https://${WAVE_CONFIG.environment === 'production' ? 'us-central1' : 'us-central1'}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mobysApi`;

      const callbackUrl = `${baseUrl}/webhook/payment`;

      const paymentRequest: WavePaymentRequest = {
        amount,
        currency,
        business_id: WAVE_CONFIG.businessId,
        phone: phone.replace('+', ''), // Remove + prefix for Wave
        description: metadata?.description || `Payment for ${metadata?.order_id || transactionId}`,
        reference: metadata?.order_id || transactionId,
        callback_url: callbackUrl,
        metadata: {
          ...metadata,
          mobys_transaction_id: transactionId,
        },
      };

      console.log('Wave payment request:', JSON.stringify(paymentRequest, null, 2));

      const response: AxiosResponse<WavePaymentResponse> = await this.client.post(
        '/v1/requests',
        paymentRequest
      );

      console.log('Wave payment response:', JSON.stringify(response.data, null, 2));

      if (!response.data.id) {
        throw new Error('Wave payment initiation failed: No payment ID returned');
      }

      return {
        provider: 'wave',
        short_url: response.data.short_url || `https://wave.com/pay/${response.data.id}`,
        status: 'pending',
        amount,
        currency,
        phone,
        metadata: metadata || {},
        wave_id: response.data.id,
      };
    } catch (error: any) {
      console.error('Wave payment initiation error:', error.response?.data || error.message);
      throw new Error(`Wave payment failed: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(waveId: string): Promise<WavePaymentStatus> {
    try {
      const response: AxiosResponse<WavePaymentStatus> = await this.client.get(
        `/v1/requests/${waveId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('Wave status check error:', error.response?.data || error.message);
      throw new Error(`Failed to check Wave payment status: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Verify webhook signature using HMAC
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // In sandbox mode, accept all webhooks for testing
      if (WAVE_CONFIG.environment === 'sandbox') {
        console.log('Wave: Sandbox mode - accepting webhook without signature verification');
        return true;
      }

      // In production, verify the signature
      if (!WAVE_CONFIG.webhookSecret) {
        console.error('Wave: Webhook secret not configured');
        return false;
      }

      if (!signature) {
        console.error('Wave: No signature provided in webhook');
        return false;
      }

      // Create HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', WAVE_CONFIG.webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      console.log('Wave webhook signature verification:', {
        provided: signature,
        expected: expectedSignature,
        isValid
      });

      return isValid;
    } catch (error) {
      console.error('Wave webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse webhook payload with enhanced error handling
   */
  parseWebhookPayload(body: any): {
    transaction_id: string;
    status: string;
    amount?: number;
    currency?: string;
    wave_id?: string;
    message?: string;
  } {
    try {
      // Wave webhook format
      if (body.id && body.status) {
        return {
          transaction_id: body.metadata?.mobys_transaction_id || body.id,
          status: body.status,
          amount: body.amount,
          currency: body.currency,
          wave_id: body.id,
          message: body.description,
        };
      }

      // Handle different webhook formats
      if (body.wave_id && body.status) {
        return {
          transaction_id: body.mobys_transaction_id || body.wave_id,
          status: body.status,
          amount: body.amount,
          currency: body.currency,
          wave_id: body.wave_id,
          message: body.message || body.description,
        };
      }

      throw new Error('Invalid Wave webhook payload format');
    } catch (error: any) {
      console.error('Wave webhook parsing error:', error);
      throw new Error(`Failed to parse Wave webhook: ${error.message}`);
    }
  }

  /**
   * Get business information
   */
  async getBusinessInfo(): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(`/v1/businesses/${WAVE_CONFIG.businessId}`);
      return response.data;
    } catch (error: any) {
      console.error('Wave business info error:', error.response?.data || error.message);
      throw new Error(`Failed to get Wave business info: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Cancel a payment request
   */
  async cancelPayment(waveId: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.delete(`/v1/requests/${waveId}`);
      return response.data;
    } catch (error: any) {
      console.error('Wave cancel payment error:', error.response?.data || error.message);
      throw new Error(`Failed to cancel Wave payment: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    }
  }
}

// Export singleton instance
export const waveProvider = new WaveProvider(); 