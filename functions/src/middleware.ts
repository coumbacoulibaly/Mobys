// src/middleware.ts
// Enhanced middleware for Mobys API with rate limiting and security

import { Request, Response, NextFunction } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { WAVE_CONFIG, ORANGE_MONEY_CONFIG } from './config';
import { validateWestAfricanPhone, isProviderSupportedInCountry } from './utils/phone-validation';

const db = getFirestore();

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window
const RATE_LIMIT_MAX_REQUESTS_PER_IP = 1000; // 1000 requests per window per IP

// Webhook IP whitelist (in production, these should be the actual provider IPs)
const WEBHOOK_IP_WHITELIST = [
  // Wave IPs (example - replace with actual IPs)
  '52.84.0.0/14',
  '52.84.0.0/15',
  // Orange Money IPs (example - replace with actual IPs)
  '185.60.0.0/16',
  '185.61.0.0/16',
  // Local development
  '127.0.0.1',
  '::1',
  // Firebase Functions IPs
  '0.0.0.0/0' // Temporarily allow all for development
];

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    apiKey: string;
    permissions: string[];
  };
}

// HTTPS enforcement middleware
export function httpsEnforcement(req: Request, res: Response, next: NextFunction): void {
  // Check if we're in production and if the request is HTTP
  if (process.env.NODE_ENV === 'production' && 
      req.headers['x-forwarded-proto'] === 'http') {
    // Redirect to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    res.redirect(301, httpsUrl);
    return;
  }
  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // HTTP Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
}

// Rate limiting middleware
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // IP-based rate limiting
  const ipKey = `ip:${ip}`;
  const ipLimit = rateLimitStore.get(ipKey);
  
  if (ipLimit && now < ipLimit.resetTime) {
    if (ipLimit.count >= RATE_LIMIT_MAX_REQUESTS_PER_IP) {
      res.status(429).json({ 
        error: 'Too many requests from this IP address.',
        retryAfter: Math.ceil((ipLimit.resetTime - now) / 1000)
      });
      return;
    }
    ipLimit.count++;
  } else {
    rateLimitStore.set(ipKey, { 
      count: 1, 
      resetTime: now + RATE_LIMIT_WINDOW 
    });
  }
  
  next();
}

// API key-based rate limiting
export function apiKeyRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user?.apiKey) {
    return next();
  }
  
  const now = Date.now();
  const apiKey = req.user.apiKey;
  const apiKeyLimit = rateLimitStore.get(`apikey:${apiKey}`);
  
  if (apiKeyLimit && now < apiKeyLimit.resetTime) {
    if (apiKeyLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({ 
        error: 'API key rate limit exceeded.',
        retryAfter: Math.ceil((apiKeyLimit.resetTime - now) / 1000)
      });
      return;
    }
    apiKeyLimit.count++;
  } else {
    rateLimitStore.set(`apikey:${apiKey}`, { 
      count: 1, 
      resetTime: now + RATE_LIMIT_WINDOW 
    });
  }
  
  next();
}

// Enhanced API key authentication middleware
export async function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Missing or invalid Authorization header.',
        code: 'MISSING_AUTH_HEADER'
      });
      return;
    }
    
  const apiKey = authHeader.split(' ')[1];
    
    if (!apiKey || apiKey.length < 10) {
      res.status(401).json({ 
        error: 'Invalid API key format.',
        code: 'INVALID_API_KEY_FORMAT'
      });
      return;
    }
    
    // Look up API key in Firestore
    const apiKeyDoc = await db.collection('api_keys').doc(apiKey).get();
    
    if (!apiKeyDoc.exists) {
      res.status(401).json({ 
        error: 'Invalid API key.',
        code: 'INVALID_API_KEY'
      });
      return;
    }
    
    const apiKeyData = apiKeyDoc.data();
    
    if (!apiKeyData) {
      res.status(401).json({ 
        error: 'Invalid API key.',
        code: 'INVALID_API_KEY'
      });
      return;
    }
    
    // Check if API key is active
    if (!apiKeyData.active) {
      res.status(401).json({ 
        error: 'API key is inactive.',
        code: 'INACTIVE_API_KEY'
      });
      return;
    }
    
    // Check if API key has expired
    if (apiKeyData.expiresAt && new Date() > apiKeyData.expiresAt.toDate()) {
      res.status(401).json({ 
        error: 'API key has expired.',
        code: 'EXPIRED_API_KEY'
      });
      return;
    }
    
    // Update last used timestamp
    await apiKeyDoc.ref.update({
      lastUsedAt: FieldValue.serverTimestamp(),
      lastUsedIp: req.ip || req.connection.remoteAddress
    });
    
    // Attach user info to request
    req.user = {
      id: apiKeyData.userId,
      apiKey: apiKey,
      permissions: apiKeyData.permissions || []
    };
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication service error.',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
}

// Request validation middleware
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Basic validation for common fields
      if (req.body.amount && (typeof req.body.amount !== 'number' || req.body.amount <= 0)) {
        res.status(400).json({ 
          error: 'Amount must be a positive number.',
          code: 'INVALID_AMOUNT'
        });
        return;
      }
      
      if (req.body.currency && req.body.currency !== 'XOF') {
        res.status(400).json({ 
          error: 'Currency must be XOF.',
          code: 'INVALID_CURRENCY'
        });
        return;
      }
      
      // Enhanced phone number validation for West African countries
      if (req.body.phone) {
        const phoneValidation = validateWestAfricanPhone(req.body.phone);
        if (!phoneValidation.isValid) {
          res.status(400).json({ 
            error: phoneValidation.error || 'Invalid phone number format.',
            code: 'INVALID_PHONE'
          });
          return;
        }
        
        // Check if the payment method is supported in the detected country
        if (req.body.method && phoneValidation.country) {
          const isSupported = isProviderSupportedInCountry(req.body.method, phoneValidation.country.name);
          if (!isSupported) {
            res.status(400).json({ 
              error: `${req.body.method} is not supported in ${phoneValidation.country.name}. Supported providers: ${phoneValidation.country.supportedProviders.join(', ')}`,
              code: 'PROVIDER_NOT_SUPPORTED'
            });
            return;
          }
        }
      }
      
      next();
    } catch (error) {
      res.status(400).json({ 
        error: 'Request validation failed.',
        code: 'VALIDATION_ERROR'
      });
    }
  };
}

// CORS middleware
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} ${logData.statusCode} ${logData.duration}`);
    
    // Log to Firestore for analytics (optional)
    if (process.env.NODE_ENV === 'production') {
      db.collection('api_logs').add({
        ...logData,
        createdAt: FieldValue.serverTimestamp()
      }).catch(err => console.error('Failed to log to Firestore:', err));
    }
  });
  
  next();
}

// Error handling middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('Error:', err);
  
  // Log error to Firestore in production
  if (process.env.NODE_ENV === 'production') {
    db.collection('error_logs').add({
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: FieldValue.serverTimestamp()
    }).catch(logErr => console.error('Failed to log error:', logErr));
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
    code: err.code || 'INTERNAL_ERROR'
  });
}

// Webhook IP whitelisting middleware
export function webhookIpWhitelist(req: Request, res: Response, next: NextFunction): void {
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = req.ip || 
                   req.connection.remoteAddress || 
                   (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 
                   'unknown';
  
  // In development, allow all IPs
  if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
    console.log('Webhook IP check: Development mode - allowing all IPs');
    return next();
  }

  // Check if IP is in whitelist
  const isAllowed = WEBHOOK_IP_WHITELIST.some(allowedIp => {
    if (allowedIp.includes('/')) {
      // CIDR notation
      return isIpInRange(clientIp, allowedIp);
    } else {
      // Single IP
      return clientIp === allowedIp;
    }
  });

  if (!isAllowed) {
    console.warn(`Webhook rejected from unauthorized IP: ${clientIp}`);
    res.status(403).json({
      error: 'Unauthorized webhook source.',
      code: 'UNAUTHORIZED_IP'
    });
    return;
  }

  console.log(`Webhook accepted from IP: ${clientIp}`);
  next();
}

// Helper function to check if IP is in CIDR range
function isIpInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~((1 << (32 - parseInt(bits))) - 1);
    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);
    return (ipLong & mask) === (rangeLong & mask);
  } catch {
    return false;
  }
}

// Helper function to convert IP to long integer
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Webhook signature verification middleware
export function webhookSignatureVerification(req: Request, res: Response, next: NextFunction): void {
  try {
    const signature = req.headers['x-wave-signature'] || req.headers['x-orange-signature'] || req.headers['signature'];
    const provider = req.headers['x-provider'] || detectProvider(req);
    
    if (!signature) {
      console.warn('Webhook received without signature');
      // In development, allow webhooks without signatures
      if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR) {
        return next();
      }
      res.status(401).json({
        error: 'Missing webhook signature.',
        code: 'MISSING_SIGNATURE'
      });
      return;
    }

    // Get the raw body for signature verification
    const payload = JSON.stringify(req.body);
    
    let isValid = false;
    
    if (provider === 'wave') {
      isValid = verifyWaveSignature(payload, signature as string);
    } else if (provider === 'orange_money') {
      isValid = verifyOrangeMoneySignature(payload, signature as string);
    }

    if (!isValid) {
      console.warn(`Invalid webhook signature for provider: ${provider}`);
      res.status(401).json({
        error: 'Invalid webhook signature.',
        code: 'INVALID_SIGNATURE'
      });
      return;
    }

    console.log(`Webhook signature verified for provider: ${provider}`);
    next();
  } catch (error: any) {
    console.error('Webhook signature verification error:', error);
    res.status(500).json({
      error: 'Webhook signature verification failed.',
      code: 'SIGNATURE_VERIFICATION_ERROR'
    });
  }
}

// Helper function to detect provider from request
function detectProvider(req: Request): string {
  if (req.body.wave_id || req.headers['x-wave-signature']) {
    return 'wave';
  }
  if (req.body.order_id || req.query.order_id || req.headers['x-orange-signature']) {
    return 'orange_money';
  }
  return 'unknown';
}

// Helper function to verify Wave signature
function verifyWaveSignature(payload: string, signature: string): boolean {
  if (WAVE_CONFIG.environment === 'sandbox') {
    return true;
  }
  
  if (!WAVE_CONFIG.webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', WAVE_CONFIG.webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Helper function to verify Orange Money signature
function verifyOrangeMoneySignature(payload: string, signature: string): boolean {
  if (ORANGE_MONEY_CONFIG.environment === 'sandbox') {
    return true;
  }
  
  if (!ORANGE_MONEY_CONFIG.webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', ORANGE_MONEY_CONFIG.webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Webhook logging middleware
export function webhookLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log webhook receipt
  const logData = {
    id: webhookId,
    provider: detectProvider(req),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString(),
    status: 'received'
  };

  console.log(`Webhook received: ${logData.provider} - ${webhookId}`);

  // Store webhook log in Firestore
  db.collection('webhooks').doc(webhookId).set({
    ...logData,
    createdAt: FieldValue.serverTimestamp()
  }).catch(err => console.error('Failed to log webhook:', err));

  // Override res.json to log the response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    
    // Update webhook log with response
    db.collection('webhooks').doc(webhookId).update({
      response: data,
      status: res.statusCode < 400 ? 'processed' : 'failed',
      duration: `${duration}ms`,
      processedAt: FieldValue.serverTimestamp()
    }).catch(err => console.error('Failed to update webhook log:', err));

    console.log(`Webhook processed: ${logData.provider} - ${webhookId} - ${res.statusCode} - ${duration}ms`);
    
    return originalJson.call(this, data);
  };

  next();
} 