import { pool } from '../config/database';

interface PlanData {
  plan_name: string;
  amount: number;
  currency?: string;
  start_date?: Date;
  razorpay_subscription_id?: string;
}

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const createSubscription = async (
  schoolId: number,
  planData: PlanData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verify school exists and is active
    const schoolCheck = await client.query(
      'SELECT id, is_active FROM schools WHERE id = $1',
      [schoolId]
    );

    if (schoolCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School not found'
      };
    }

    if (!schoolCheck.rows[0].is_active) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School is not active'
      };
    }

    // Deactivate any existing active subscriptions
    await client.query(
      `UPDATE subscriptions
       SET status = 'inactive', updated_at = NOW()
       WHERE school_id = $1 AND status = 'active'`,
      [schoolId]
    );

    // Calculate dates - default to 1 month
    const startDate = planData.start_date || new Date();
    let endDate = new Date(startDate);
    
    // Determine duration from plan name
    if (planData.plan_name.toLowerCase().includes('yearly')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (planData.plan_name.toLowerCase().includes('quarterly')) {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      // Default to monthly
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create new subscription
    const result = await client.query(
      `INSERT INTO subscriptions (
        school_id, plan_name, amount, currency, start_date, end_date,
        razorpay_subscription_id, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
      RETURNING *`,
      [
        schoolId,
        planData.plan_name,
        planData.amount,
        planData.currency || 'INR',
        startDate,
        endDate,
        planData.razorpay_subscription_id || null
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Subscription created successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create subscription error:', error);
    return {
      success: false,
      error: 'Failed to create subscription'
    };
  } finally {
    client.release();
  }
};

export const getSubscriptionBySchool = async (
  schoolId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT s.*, sch.name as school_name, sch.slug as school_slug
       FROM subscriptions s
       INNER JOIN schools sch ON s.school_id = sch.id
       WHERE s.school_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [schoolId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'No subscription found for this school'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Get subscription error:', error);
    return {
      success: false,
      error: 'Failed to fetch subscription'
    };
  } finally {
    client.release();
  }
};

export const updateSubscriptionStatus = async (
  id: number,
  status: 'active' | 'expired' | 'cancelled' | 'suspended'
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `UPDATE subscriptions
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Subscription not found'
      };
    }

    // If subscription is cancelled or suspended, deactivate the school
    if (status === 'cancelled' || status === 'suspended') {
      await client.query(
        `UPDATE schools
         SET is_active = false, updated_at = NOW()
         WHERE id = $1`,
        [result.rows[0].school_id]
      );
    }

    return {
      success: true,
      data: result.rows[0],
      message: `Subscription ${status} successfully`
    };
  } catch (error: any) {
    console.error('Update subscription status error:', error);
    return {
      success: false,
      error: 'Failed to update subscription status'
    };
  } finally {
    client.release();
  }
};

export const checkSubscriptionActive = async (
  schoolId: number
): Promise<boolean> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT id, status, end_date
       FROM subscriptions
       WHERE school_id = $1 AND status = 'active' AND end_date > NOW()
       LIMIT 1`,
      [schoolId]
    );

    return result.rows.length > 0;
  } catch (error: any) {
    console.error('Check subscription active error:', error);
    return false;
  } finally {
    client.release();
  }
};

export const handleSubscriptionExpiry = async (): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Find all expired subscriptions
    const expiredResult = await client.query(
      `SELECT id, school_id
       FROM subscriptions
       WHERE status = 'active' AND end_date <= NOW()`
    );

    if (expiredResult.rows.length === 0) {
      await client.query('COMMIT');
      return {
        success: true,
        data: {
          expiredCount: 0,
          deactivatedSchools: 0
        },
        message: 'No expired subscriptions found'
      };
    }

    const expiredIds = expiredResult.rows.map(row => row.id);
    const schoolIds = expiredResult.rows.map(row => row.school_id);

    // Update expired subscriptions
    await client.query(
      `UPDATE subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE id = ANY($1)`,
      [expiredIds]
    );

    // Deactivate schools with expired subscriptions
    const deactivatedSchools = await client.query(
      `UPDATE schools
       SET is_active = false, updated_at = NOW()
       WHERE id = ANY($1) AND is_active = true
       RETURNING id`,
      [schoolIds]
    );

    // Deactivate users of schools with expired subscriptions
    await client.query(
      `UPDATE users
       SET is_active = false, updated_at = NOW()
       WHERE school_id = ANY($1) AND is_active = true`,
      [schoolIds]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        expiredCount: expiredIds.length,
        deactivatedSchools: deactivatedSchools.rows.length
      },
      message: `Processed ${expiredIds.length} expired subscriptions and deactivated ${deactivatedSchools.rows.length} schools`
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Handle subscription expiry error:', error);
    return {
      success: false,
      error: 'Failed to handle subscription expiry'
    };
  } finally {
    client.release();
  }
};

export const getAllActiveSubscriptions = async (): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT s.*, sch.name as school_name, sch.slug as school_slug
       FROM subscriptions s
       INNER JOIN schools sch ON s.school_id = sch.id
       WHERE s.status = 'active'
       ORDER BY s.end_date ASC`
    );

    return {
      success: true,
      data: result.rows
    };
  } catch (error: any) {
    console.error('Get all active subscriptions error:', error);
    return {
      success: false,
      error: 'Failed to fetch active subscriptions'
    };
  } finally {
    client.release();
  }
};

export const getExpiringSubscriptions = async (
  daysBeforeExpiry: number = 7
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT s.*, sch.name as school_name, sch.email as school_email
       FROM subscriptions s
       INNER JOIN schools sch ON s.school_id = sch.id
       WHERE s.status = 'active' 
         AND s.end_date > NOW() 
         AND s.end_date <= NOW() + INTERVAL '1 day' * $1
       ORDER BY s.end_date ASC`,
      [daysBeforeExpiry]
    );

    return {
      success: true,
      data: result.rows
    };
  } catch (error: any) {
    console.error('Get expiring subscriptions error:', error);
    return {
      success: false,
      error: 'Failed to fetch expiring subscriptions'
    };
  } finally {
    client.release();
  }
};
