// src/providers/index.ts
// Provider factory and unified interface

import { orangeMoneyProvider } from './orange-money';
import { waveProvider } from './wave';

export interface PaymentProvider {
  initiatePayment(params: {
    amount: number;
    currency: string;
    phone: string;
    metadata: any;
    transactionId: string;
  }): Promise<any>;
  
  checkPaymentStatus(id: string): Promise<any>;
  
  verifyWebhookSignature(payload: string, signature: string): boolean;
  
  parseWebhookPayload(body: any, query?: any): any;
}

export interface PaymentResponse {
  provider: string;
  status: string;
  amount: number;
  currency: string;
  phone: string;
  metadata: any;
  transaction_id: string;
  [key: string]: any; // Additional provider-specific fields
}

export class ProviderFactory {
  private static providers: Map<string, PaymentProvider> = new Map();

  static {
    // Register providers
    ProviderFactory.providers.set('orange_money', orangeMoneyProvider);
    ProviderFactory.providers.set('wave', waveProvider);
  }

  /**
   * Get a provider by name
   */
  static getProvider(name: string): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  /**
   * Get all available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  static hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Initiate payment with any provider
   */
  static async initiatePayment(providerName: string, params: {
    amount: number;
    currency: string;
    phone: string;
    metadata: any;
    transactionId: string;
  }): Promise<PaymentResponse> {
    const provider = this.getProvider(providerName);
    const response = await provider.initiatePayment(params);
    
    return {
      ...response,
      transaction_id: params.transactionId,
    };
  }

  /**
   * Check payment status with any provider
   */
  static async checkPaymentStatus(providerName: string, id: string): Promise<any> {
    const provider = this.getProvider(providerName);
    return await provider.checkPaymentStatus(id);
  }

  /**
   * Parse webhook payload from any provider
   */
  static parseWebhookPayload(providerName: string, body: any, query?: any): any {
    const provider = this.getProvider(providerName);
    return provider.parseWebhookPayload(body, query);
  }

  /**
   * Verify webhook signature from any provider
   */
  static verifyWebhookSignature(providerName: string, payload: string, signature: string): boolean {
    const provider = this.getProvider(providerName);
    return provider.verifyWebhookSignature(payload, signature);
  }
}

// Export individual providers for direct access
export { orangeMoneyProvider } from './orange-money';
export { waveProvider } from './wave';

// Export the factory as default
export default ProviderFactory; 