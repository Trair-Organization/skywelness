import { Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Booking } from '../database/entities/booking.entity';
import { PushService } from '../notifications/push.service';
import { StripeService } from './stripe.service';

@Controller('payments/webhook')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    private readonly pushService: PushService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody || !signature) {
      return { received: false };
    }

    const event = this.stripeService.constructEvent(rawBody, signature);
    if (!event) {
      return { received: false };
    }

    this.logger.log(`Stripe event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        metadata?: { bookingId?: string };
        payment_intent?: string;
      };
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.stripeSessionId = session.id;
          booking.stripePaymentIntentId =
            typeof session.payment_intent === 'string' ? session.payment_intent : null;
          booking.status = 'confirmed';
          await this.bookingRepo.save(booking);

          // Notify user
          void this.pushService.sendToUser(
            booking.userId,
            '💳 Ödeme Alındı',
            'Rezervasyon ödemeniz başarıyla alındı.',
            { type: 'payment_confirmed', bookingId },
          );

          this.logger.log(`Booking ${bookingId} payment confirmed`);
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as { metadata?: { bookingId?: string } };
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
        if (booking && booking.paymentStatus === 'pending') {
          booking.paymentStatus = 'failed';
          await this.bookingRepo.save(booking);
          this.logger.log(`Booking ${bookingId} payment expired`);
        }
      }
    }

    return { received: true };
  }
}
