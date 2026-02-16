import Razorpay from 'razorpay';
import crypto from 'crypto';
import { pool } from '../config/database';

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface OrderData {
  amount: number;
  currency: string;
  schoolId: number;
  receipt?: string;
  notes?: any;
}

interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface SubscriptionData {
  plan_id: string;
  schoolId: number;
  total_count?: number;
  customer_notify?: number;
  notes?: any;
}

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

export const createOrder = async (
  orderData: OrderData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    // Verify school exists
    const schoolCheck = await client.query(
      'SELECT id, name, email FROM schools WHERE id = $1',
      [orderData.schoolId]
    );

    if (schoolCheck.rows.length === 0) {
      return {
        success: false,
        error: 'School not found'
      };
    }

    const school = schoolCheck.rows[0];

    // Create Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: orderData.amount * 100, // Amount in paise
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt || `rcpt_${Date.now()}`,
      notes: {
        school_id: orderData.schoolId,
        school_name: school.name,
        ...orderData.notes
      }
    });

    // Store order in database
    const result = await client.query(
      `INSERT INTO payments (
        school_id, razorpay_order_id, amount, currency, status,
        receipt, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'created', $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        orderData.schoolId,
        razorpayOrder.id,
        orderData.amount,
        orderData.currency || 'INR',
        razorpayOrder.receipt,
        JSON.stringify(razorpayOrder.notes || {})
      ]
    );

    return {
      success: true,
      data: {
        order: razorpayOrder,
        payment: result.rows[0]
      },
      message: 'Order created successfully'
    };
  } catch (error: any) {
    console.error('Create order error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order'
    };
  } finally {
    client.release();
  }
};

export const verifyPayment = async (
  paymentData: VerifyPaymentData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${paymentData.razorpay_order_id}|${paymentData.razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== paymentData.razorpay_signature) {
      return {
        success: false,
        error: 'Invalid payment signature'
      };
    }

    await client.query('BEGIN');

    // Update payment record
    const paymentResult = await client.query(
      `UPDATE payments
       SET razorpay_payment_id = $1,
           razorpay_signature = $2,
           status = 'completed',
           paid_at = NOW(),
           updated_at = NOW()
       WHERE razorpay_order_id = $3
       RETURNING *`,
      [
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature,
        paymentData.razorpay_order_id
      ]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Payment record not found'
      };
    }

    const payment = paymentResult.rows[0];

    // Fetch payment details from Razorpay
    const razorpayPayment = await razorpayInstance.payments.fetch(
      paymentData.razorpay_payment_id
    );

    // Update additional payment details
    await client.query(
      `UPDATE payments
       SET payment_method = $1,
           payment_email = $2,
           payment_contact = $3
       WHERE id = $4`,
      [
        razorpayPayment.method,
        razorpayPayment.email,
        razorpayPayment.contact,
        payment.id
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        payment: paymentResult.rows[0],
        razorpayPayment
      },
      message: 'Payment verified successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Verify payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment'
    };
  } finally {
    client.release();
  }
};

export const createSubscription = async (
  subscriptionData: SubscriptionData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    // Verify school exists
    const schoolCheck = await client.query(
      'SELECT id, name, email FROM schools WHERE id = $1',
      [subscriptionData.schoolId]
    );

    if (schoolCheck.rows.length === 0) {
      return {
        success: false,
        error: 'School not found'
      };
    }

    const school = schoolCheck.rows[0];

    // Create Razorpay subscription
    const razorpaySubscription = await razorpayInstance.subscriptions.create({
      plan_id: subscriptionData.plan_id,
      total_count: subscriptionData.total_count || 12,
      customer_notify: (subscriptionData.customer_notify || 1) as 0 | 1,
      notes: {
        school_id: subscriptionData.schoolId,
        school_name: school.name,
        ...subscriptionData.notes
      }
    });

    // Store subscription in database
    const result = await client.query(
      `INSERT INTO razorpay_subscriptions (
        school_id, razorpay_subscription_id, razorpay_plan_id,
        status, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [
        subscriptionData.schoolId,
        (razorpaySubscription as any).id,
        subscriptionData.plan_id,
        (razorpaySubscription as any).status,
        JSON.stringify((razorpaySubscription as any).notes || {})
      ]
    );

    return {
      success: true,
      data: {
        subscription: razorpaySubscription,
        dbSubscription: result.rows[0]
      },
      message: 'Subscription created successfully'
    };
  } catch (error: any) {
    console.error('Create subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription'
    };
  } finally {
    client.release();
  }
};

export const cancelSubscription = async (
  subscriptionId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Cancel Razorpay subscription
    const razorpaySubscription = await razorpayInstance.subscriptions.cancel(
      subscriptionId,
      true // cancel_at_cycle_end
    );

    // Update database
    const result = await client.query(
      `UPDATE razorpay_subscriptions
       SET status = $1, cancelled_at = NOW(), updated_at = NOW()
       WHERE razorpay_subscription_id = $2
       RETURNING *`,
      [razorpaySubscription.status, subscriptionId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Subscription not found in database'
      };
    }

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        subscription: razorpaySubscription,
        dbSubscription: result.rows[0]
      },
      message: 'Subscription cancelled successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Cancel subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription'
    };
  } finally {
    client.release();
  }
};

export const getPaymentById = async (
  paymentId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT p.*, s.name as school_name, s.email as school_email
       FROM payments p
       INNER JOIN schools s ON p.school_id = s.id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Get payment error:', error);
    return {
      success: false,
      error: 'Failed to fetch payment'
    };
  } finally {
    client.release();
  }
};

export const getPaymentsBySchool = async (
  schoolId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM payments
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [schoolId]
    );

    return {
      success: true,
      data: result.rows
    };
  } catch (error: any) {
    console.error('Get payments by school error:', error);
    return {
      success: false,
      error: 'Failed to fetch payments'
    };
  } finally {
    client.release();
  }
};

export const refundPayment = async (
  paymentId: string,
  amount?: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create refund in Razorpay
    const refundData: any = { payment_id: paymentId };
    if (amount) {
      refundData.amount = amount * 100; // Amount in paise
    }

    const razorpayRefund = await razorpayInstance.payments.refund(
      paymentId,
      refundData
    );

    // Update payment record
    await client.query(
      `UPDATE payments
       SET status = 'refunded',
           refund_id = $1,
           refunded_at = NOW(),
           updated_at = NOW()
       WHERE razorpay_payment_id = $2`,
      [razorpayRefund.id, paymentId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: razorpayRefund,
      message: 'Refund processed successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Refund payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process refund'
    };
  } finally {
    client.release();
  }
};
