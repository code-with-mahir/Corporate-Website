import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { config } from '../config/env';

interface LoginResponse {
  success: boolean;
  data?: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

interface RefreshTokenResponse {
  success: boolean;
  data?: {
    accessToken: string;
  };
  error?: string;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export const login = async (
  email: string,
  password: string,
  schoolSlug?: string
): Promise<LoginResponse> => {
  const client = await pool.connect();
  
  try {
    let query: string;
    let params: any[];

    if (schoolSlug) {
      // School user login
      query = `
        SELECT u.*, s.id as school_id, s.name as school_name, s.slug as school_slug, s.is_active as school_is_active
        FROM users u
        INNER JOIN schools s ON u.school_id = s.id
        WHERE u.email = $1 AND s.slug = $2 AND u.is_active = true
      `;
      params = [email, schoolSlug];
    } else {
      // Super admin login
      query = `
        SELECT u.*
        FROM users u
        WHERE u.email = $1 AND u.role = 'super_admin' AND u.is_active = true
      `;
      params = [email];
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Check if school is active (for school users)
    if (schoolSlug && !user.school_is_active) {
      return {
        success: false,
        error: 'School is not active'
      };
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.school_id || null
      },
      config.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      config.jwtSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Store refresh token in database
    const expiryDays = REFRESH_TOKEN_EXPIRY.replace('d', '');
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 day' * $3)`,
      [user.id, refreshToken, parseInt(expiryDays)]
    );

    // Update last login
    await client.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    // Remove password from response
    delete user.password_hash;

    return {
      success: true,
      data: {
        user,
        accessToken,
        refreshToken
      }
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Login failed'
    };
  } finally {
    client.release();
  }
};

export const refreshToken = async (
  refreshTokenValue: string
): Promise<RefreshTokenResponse> => {
  const client = await pool.connect();
  
  try {
    // Verify refresh token
    const decoded: any = jwt.verify(refreshTokenValue, config.jwtSecret);

    if (decoded.type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid token type'
      };
    }

    // Check if refresh token exists and is not revoked
    const tokenResult = await client.query(
      `SELECT rt.*, u.email, u.role, u.school_id, u.is_active
       FROM refresh_tokens rt
       INNER JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
      [refreshTokenValue]
    );

    if (tokenResult.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid or expired refresh token'
      };
    }

    const tokenData = tokenResult.rows[0];

    if (!tokenData.is_active) {
      return {
        success: false,
        error: 'User is not active'
      };
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: tokenData.user_id,
        email: tokenData.email,
        role: tokenData.role,
        schoolId: tokenData.school_id || null
      },
      config.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    return {
      success: true,
      data: {
        accessToken
      }
    };
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return {
      success: false,
      error: 'Invalid or expired token'
    };
  } finally {
    client.release();
  }
};

export const logout = async (userId: number): Promise<LogoutResponse> => {
  const client = await pool.connect();
  
  try {
    // Revoke all refresh tokens for the user
    await client.query(
      `UPDATE refresh_tokens
       SET revoked = true, revoked_at = NOW()
       WHERE user_id = $1 AND revoked = false`,
      [userId]
    );

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error: any) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Logout failed'
    };
  } finally {
    client.release();
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
