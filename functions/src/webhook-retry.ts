// Webhook retry mechanism

import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import * as cron from 'node-cron';

const db = getFirestore();

interface WebhookRetryConfig {
  maxRetries: number;
  retryDelays: number[]; // Delays in milliseconds
  backoffMultiplier: number;
}

const RETRY_CONFIG: WebhookRetryConfig = {
  maxRetries: 5,
  retryDelays: [1000, 5000, 15000, 60000, 300000], // 1s, 5s, 15s, 1m, 5m
  backoffMultiplier: 2
};

interface FailedWebhook {
  id: string;
  provider: string;
  payload: any;
  error: string;
  retryCount: number;
  nextRetryAt: Date;
  createdAt: Date;
}

export class WebhookRetryManager {
  private static instance: WebhookRetryManager;
  private isRunning: boolean = false;

  private constructor() {
    this.startRetryScheduler();
  }

  static getInstance(): WebhookRetryManager {
    if (!WebhookRetryManager.instance) {
      WebhookRetryManager.instance = new WebhookRetryManager();
    }
    return WebhookRetryManager.instance;
  }

  /**
   * Schedule a webhook for retry
   */
  async scheduleRetry(webhookId: string, provider: string, payload: any, error: string): Promise<void> {
    try {
      const retryData: FailedWebhook = {
        id: webhookId,
        provider,
        payload,
        error,
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + RETRY_CONFIG.retryDelays[0]),
        createdAt: new Date()
      };

      await db.collection('webhook_retries').doc(webhookId).set({
        ...retryData,
        createdAt: FieldValue.serverTimestamp()
      });

      console.log(`Webhook ${webhookId} scheduled for retry`);
    } catch (error: any) {
      console.error('Failed to schedule webhook retry:', error);
    }
  }

  /**
   * Start the retry scheduler
   */
  private startRetryScheduler(): void {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        return; // Prevent overlapping executions
      }

      this.isRunning = true;
      try {
        await this.processRetries();
      } catch (error) {
        console.error('Webhook retry processing error:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('Webhook retry scheduler started');
  }

  /**
   * Process pending webhook retries
   */
  private async processRetries(): Promise<void> {
    const now = new Date();
    
    // Get webhooks ready for retry
    const retryQuery = db.collection('webhook_retries')
      .where('nextRetryAt', '<=', now)
      .where('retryCount', '<', RETRY_CONFIG.maxRetries);

    const retryDocs = await retryQuery.get();

    if (retryDocs.empty) {
      return;
    }

    console.log(`Processing ${retryDocs.size} webhook retries`);

    for (const doc of retryDocs.docs) {
      const retryData = doc.data() as FailedWebhook;
      
      try {
        await this.retryWebhook(retryData);
      } catch (error: any) {
        console.error(`Failed to retry webhook ${retryData.id}:`, error);
        await this.handleRetryFailure(retryData, error.message);
      }
    }
  }

  /**
   * Retry a specific webhook
   */
  private async retryWebhook(retryData: FailedWebhook): Promise<void> {
    const { id, provider, payload, retryCount } = retryData;

    console.log(`Retrying webhook ${id} (attempt ${retryCount + 1})`);

    // Simulate webhook processing (in real implementation, this would call the actual webhook handler)
    const success = await this.processWebhook(provider, payload);

    if (success) {
      // Mark as successful
      await db.collection('webhook_retries').doc(id).delete();
      console.log(`Webhook ${id} retry successful`);
    } else {
      // Schedule next retry
      await this.handleRetryFailure(retryData, 'Processing failed');
    }
  }

  /**
   * Process webhook (simulated - replace with actual webhook processing logic)
   */
  private async processWebhook(provider: string, payload: any): Promise<boolean> {
    try {
      // Simulate webhook processing
      // In real implementation, this would call the actual webhook handler
      console.log(`Processing webhook for provider: ${provider}`);
      
      // Simulate random success/failure for testing
      const success = Math.random() > 0.3; // 70% success rate
      
      if (success) {
        // Update transaction status
        const transactionId = payload.transaction_id || payload.order_id || payload.wave_id;
        if (transactionId) {
          await db.collection('transactions').doc(transactionId).update({
            status: 'success',
            updated_at: FieldValue.serverTimestamp(),
            retry_processed_at: FieldValue.serverTimestamp()
          });
        }
      }

      return success;
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return false;
    }
  }

  /**
   * Handle retry failure
   */
  private async handleRetryFailure(retryData: FailedWebhook, error: string): Promise<void> {
    const { id, retryCount } = retryData;
    const newRetryCount = retryCount + 1;

    if (newRetryCount >= RETRY_CONFIG.maxRetries) {
      // Max retries reached, mark as permanently failed
      await db.collection('webhook_retries').doc(id).update({
        retryCount: newRetryCount,
        status: 'permanently_failed',
        finalError: error,
        failedAt: FieldValue.serverTimestamp()
      });

      console.log(`Webhook ${id} permanently failed after ${newRetryCount} retries`);
    } else {
      // Schedule next retry with exponential backoff
      const delay = RETRY_CONFIG.retryDelays[newRetryCount] || 
                   (RETRY_CONFIG.retryDelays[RETRY_CONFIG.retryDelays.length - 1] * 
                    Math.pow(RETRY_CONFIG.backoffMultiplier, newRetryCount - RETRY_CONFIG.retryDelays.length + 1));

      const nextRetryAt = new Date(Date.now() + delay);

      await db.collection('webhook_retries').doc(id).update({
        retryCount: newRetryCount,
        nextRetryAt,
        lastError: error,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`Webhook ${id} scheduled for retry ${newRetryCount + 1} at ${nextRetryAt}`);
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(): Promise<{
    pending: number;
    failed: number;
    total: number;
  }> {
    try {
      const pendingQuery = await db.collection('webhook_retries')
        .where('retryCount', '<', RETRY_CONFIG.maxRetries)
        .get();

      const failedQuery = await db.collection('webhook_retries')
        .where('status', '==', 'permanently_failed')
        .get();

      const totalQuery = await db.collection('webhook_retries').get();

      return {
        pending: pendingQuery.size,
        failed: failedQuery.size,
        total: totalQuery.size
      };
    } catch (error: any) {
      console.error('Failed to get retry stats:', error);
      return { pending: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Clean up old retry records
   */
  async cleanupOldRetries(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
      
      const oldRetriesQuery = await db.collection('webhook_retries')
        .where('createdAt', '<', cutoffDate)
        .get();

      const batch = db.batch();
      oldRetriesQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${oldRetriesQuery.size} old retry records`);
    } catch (error: any) {
      console.error('Failed to cleanup old retries:', error);
    }
  }
}

// Export singleton instance
export const webhookRetryManager = WebhookRetryManager.getInstance();
