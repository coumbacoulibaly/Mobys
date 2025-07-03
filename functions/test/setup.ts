// test/setup.ts
// Test setup and configuration

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK for testing
if (!process.env.FIREBASE_PROJECT_ID) {
  process.env.FIREBASE_PROJECT_ID = 'test-project';
}

// Initialize Firebase app for testing
try {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
    storageBucket: `${process.env.FIREBASE_PROJECT_ID || 'test-project'}.appspot.com`,
  });
} catch (error) {
  // App might already be initialized, which is fine
  console.log('Firebase app already initialized or error:', error);
}

// Configure Firestore for testing
const db = getFirestore();
db.settings({
  ignoreUndefinedProperties: true,
  projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test-api-key-123';
process.env.WAVE_API_KEY = 'test-wave-key';
process.env.WAVE_API_SECRET = 'test-wave-secret';
process.env.ORANGE_MONEY_API_KEY = 'test-orange-key';
process.env.ORANGE_MONEY_API_SECRET = 'test-orange-secret';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless there's an error
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = originalConsoleError; // Keep error logging for debugging
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(30000);

export { db }; 