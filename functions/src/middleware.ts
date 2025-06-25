// src/middleware.ts
// Placeholder for Mobys API middleware

import { Request, Response, NextFunction } from 'express';
import { MOBYS_API_KEY_SECRET } from './config';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }
  const apiKey = authHeader.split(' ')[1];
  // Placeholder: check against a static secret. Replace with Firestore lookup in production.
  if (apiKey !== MOBYS_API_KEY_SECRET) {
    res.status(401).json({ error: 'Invalid API key.' });
    return;
  }
  next();
}

// Example: API key authentication middleware will go here 