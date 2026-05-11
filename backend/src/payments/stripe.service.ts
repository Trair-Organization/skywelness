import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-04-30.basil' });
      this.logger.log('Stripe initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — payments disabled');
    }
  }

  get isEnabled(): boolean {
    return this.stripe !== null;
  }

  /**
   * Stripe Checkout Session oluştur.
   * Kullanıcı bu URL'e yönlendirilir, ödeme tamamlanınca webhook gelir.
   */
  async createCheckoutSession(params: {
    bookingId: string;
    amount: number; // kuruş cinsinden (TRY → kuruş: 3500₺ = 350000)
    currency: string;
    customerEmail: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ sessionId: string; url: string } | null> {
    if (!this.stripe) return null;

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: params.customerEmail,
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              unit_amount: params.amount,
              product_data: {
                name: params.description,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId: params.bookingId,
          ...params.metadata,
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      return { sessionId: session.id, url: session.url! };
    } catch (e) {
      this.logger.error('Stripe checkout session creation failed', e);
      return null;
    }
  }

  /**
   * Webhook event'ini doğrula ve parse et.
   */
  constructEvent(payload: Buffer, signature: string): Stripe.Event | null {
    if (!this.stripe) return null;
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not set');
      return null;
    }
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (e) {
      this.logger.error('Stripe webhook verification failed', e);
      return null;
    }
  }
}
