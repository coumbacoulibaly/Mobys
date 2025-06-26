// test/setup.ts
// Test setup configuration

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.WAVE_API_KEY = 'test_wave_api_key';
process.env.WAVE_API_SECRET = 'test_wave_api_secret';
process.env.WAVE_WEBHOOK_SECRET = 'test_wave_webhook_secret';
process.env.ORANGE_MONEY_API_KEY = 'test_orange_api_key';
process.env.ORANGE_MONEY_API_SECRET = 'test_orange_api_secret';
process.env.ORANGE_MONEY_WEBHOOK_SECRET = 'test_orange_webhook_secret';
process.env.ORANGE_MONEY_MERCHANT_ID = 'test_merchant_id';
process.env.ORANGE_MONEY_CLIENT_ID = 'test_client_id';
process.env.ORANGE_MONEY_CLIENT_SECRET = 'test_client_secret';

// Global test timeout
(jest as any).setTimeout(10000);

// Suppress console logs during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = (jest as any).fn();
  console.error = (jest as any).fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
(global as any).testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  createMockRequest: (data: any) => ({
    body: data,
    headers: {},
    query: {},
    params: {},
    ip: '127.0.0.1'
  }),
  createMockResponse: () => {
    const res: any = {};
    res.status = () => res;
    res.json = () => res;
    res.send = () => res;
    return res;
  }
}; 