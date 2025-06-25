// src/config.ts
// Configuration for Mobys API

import * as dotenv from 'dotenv';
dotenv.config();

// Core API Configuration
export const API_KEY = process.env.API_KEY;
export const PROJECT_ID = process.env.PROJECT_ID;
export const MOBYS_API_KEY_SECRET = process.env.MOBYS_API_KEY_SECRET;

// Orange Money Configuration
export const ORANGE_MONEY_CONFIG = {
  baseUrl: process.env.ORANGE_MONEY_BASE_URL || 'https://api.orange.com',
  clientId: process.env.ORANGE_MONEY_CLIENT_ID || '',
  clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET || '',
  merchantId: process.env.ORANGE_MONEY_MERCHANT_ID || '',
  webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET || '',
  environment: process.env.ORANGE_MONEY_ENVIRONMENT || 'sandbox', // sandbox or production
  currency: 'XOF',
  country: 'ML', // Mali, CI for Côte d'Ivoire, SN for Senegal
};

// Wave Configuration
export const WAVE_CONFIG = {
  baseUrl: process.env.WAVE_BASE_URL || 'https://api.wave.com',
  apiKey: process.env.WAVE_API_KEY || '',
  businessId: process.env.WAVE_BUSINESS_ID || '',
  webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
  environment: process.env.WAVE_ENVIRONMENT || 'sandbox', // sandbox or production
  currency: 'XOF',
  country: 'ML', // Mali, CI for Côte d'Ivoire, SN for Senegal
};

// General API Configuration
export const API_CONFIG = {
  timeout: parseInt(process.env.API_TIMEOUT || '30000'), // 30 seconds
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000'), // 1 second
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000'), // 10 seconds
};

// Validation
export function validateConfig() {
  const errors = [];
  
  if (!ORANGE_MONEY_CONFIG.clientId) {
    errors.push('ORANGE_MONEY_CLIENT_ID is required');
  }
  if (!ORANGE_MONEY_CONFIG.clientSecret) {
    errors.push('ORANGE_MONEY_CLIENT_SECRET is required');
  }
  if (!WAVE_CONFIG.apiKey) {
    errors.push('WAVE_API_KEY is required');
  }
  if (!WAVE_CONFIG.businessId) {
    errors.push('WAVE_BUSINESS_ID is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }
}

// Example: export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY; 