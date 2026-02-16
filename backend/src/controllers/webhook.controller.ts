import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

export const razorpayWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!webhookSignature) {
      res.status(400).json(errorResponse('Webhook signature missing'));
      return;
    }

    const webhookBody = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      res.status(400).json(errorResponse('Invalid webhook signature'));
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      switch (event) {
        case 'payment.authorized':
        case 'payment.captured': {
          const payment = payload.payment.entity;

          await client.query(
            `UPDATE payments
             SET razorpay_payment_id = $1,
                 status = $2,
                 payment_method = $3,
                 payment_email = $4,
                 payment_contact = $5,
                 paid_at = $6,
                 updated_at = NOW()
             WHERE razorpay_order_id = $7`,
            [
              payment.id,
              event === 'payment.captured' ? 'completed' : 'authorized',
              payment.method,
              payment.email,
              payment.contact,
              new Date(payment.created_at * 1000),
              payment.order_id
            ]
          );

          if (event === 'payment.captured') {
            const paymentRecord = await client.query(
              'SELECT school_id, notes FROM payments WHERE razorpay_order_id = $1',
              [payment.order_id]
            );

            if (paymentRecord.rows.length > 0) {
              const schoolId = paymentRecord.rows[0].school_id;
              const notes = paymentRecord.rows[0].notes;

              if (notes?.plan_name) {
                const startDate = new Date();
                let endDate = new Date(startDate);

                if (notes.plan_name.toLowerCase().includes('yearly')) {
                  endDate.setFullYear(endDate.getFullYear() + 1);
                } else if (notes.plan_name.toLowerCase().includes('quarterly')) {
                  endDate.setMonth(endDate.getMonth() + 3);
                } else {
                  endDate.setMonth(endDate.getMonth() + 1);
                }

                await client.query(
                  `UPDATE subscriptions
                   SET status = 'inactive', updated_at = NOW()
                   WHERE school_id = $1 AND status = 'active'`,
                  [schoolId]
                );

                await client.query(
                  `INSERT INTO subscriptions (
                    school_id, plan_name, amount, currency, start_date, end_date,
                    razorpay_subscription_id, status, created_at, updated_at
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
                  [
                    schoolId,
                    notes.plan_name,
                    payment.amount / 100,
                    payment.currency,
                    startDate,
                    endDate,
                    payment.id
                  ]
                );

                await client.query(
                  `UPDATE schools
                   SET is_active = true, updated_at = NOW()
                   WHERE id = $1`,
                  [schoolId]
                );
              }
            }
          }
          break;
        }

        case 'payment.failed': {
          const payment = payload.payment.entity;

          await client.query(
            `UPDATE payments
             SET status = 'failed',
                 razorpay_payment_id = $1,
                 updated_at = NOW()
             WHERE razorpay_order_id = $2`,
            [payment.id, payment.order_id]
          );
          break;
        }

        case 'subscription.activated': {
          const subscription = payload.subscription.entity;

          await client.query(
            `UPDATE razorpay_subscriptions
             SET status = 'active',
                 activated_at = NOW(),
                 updated_at = NOW()
             WHERE razorpay_subscription_id = $1`,
            [subscription.id]
          );

          const subRecord = await client.query(
            'SELECT school_id FROM razorpay_subscriptions WHERE razorpay_subscription_id = $1',
            [subscription.id]
          );

          if (subRecord.rows.length > 0) {
            await client.query(
              `UPDATE schools
               SET is_active = true, updated_at = NOW()
               WHERE id = $1`,
              [subRecord.rows[0].school_id]
            );
          }
          break;
        }

        case 'subscription.charged': {
          const subscription = payload.subscription.entity;
          const payment = payload.payment.entity;

          const subRecord = await client.query(
            'SELECT school_id FROM razorpay_subscriptions WHERE razorpay_subscription_id = $1',
            [subscription.id]
          );

          if (subRecord.rows.length > 0) {
            await client.query(
              `INSERT INTO payments (
                school_id, razorpay_payment_id, razorpay_order_id, amount, currency,
                status, payment_method, paid_at, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, NOW(), NOW())`,
              [
                subRecord.rows[0].school_id,
                payment.id,
                payment.order_id,
                payment.amount / 100,
                payment.currency,
                payment.method,
                new Date(payment.created_at * 1000)
              ]
            );
          }
          break;
        }

        case 'subscription.cancelled':
        case 'subscription.completed':
        case 'subscription.halted': {
          const subscription = payload.subscription.entity;

          await client.query(
            `UPDATE razorpay_subscriptions
             SET status = $1,
                 cancelled_at = NOW(),
                 updated_at = NOW()
             WHERE razorpay_subscription_id = $2`,
            [event.split('.')[1], subscription.id]
          );

          const subRecord = await client.query(
            'SELECT school_id FROM razorpay_subscriptions WHERE razorpay_subscription_id = $1',
            [subscription.id]
          );

          if (subRecord.rows.length > 0) {
            await client.query(
              `UPDATE subscriptions
               SET status = 'cancelled', updated_at = NOW()
               WHERE school_id = $1 AND status = 'active'`,
              [subRecord.rows[0].school_id]
            );

            await client.query(
              `UPDATE schools
               SET is_active = false, updated_at = NOW()
               WHERE id = $1`,
              [subRecord.rows[0].school_id]
            );
          }
          break;
        }

        case 'refund.created':
        case 'refund.processed': {
          const refund = payload.refund.entity;

          await client.query(
            `UPDATE payments
             SET status = 'refunded',
                 refund_id = $1,
                 refunded_at = NOW(),
                 updated_at = NOW()
             WHERE razorpay_payment_id = $2`,
            [refund.id, refund.payment_id]
          );
          break;
        }

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      await client.query('COMMIT');

      res.status(200).json(successResponse(null, 'Webhook processed successfully'));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
};
