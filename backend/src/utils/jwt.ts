import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  school_id?: string;
}

export const signToken = (
  payload: JwtPayload,
  expiresIn?: string | number
): string => {
  try {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const options: SignOptions = {
      issuer: 'school-management-system',
    };

    if (expiresIn !== undefined) {
      options.expiresIn = expiresIn as any;
    } else {
      options.expiresIn = '7d' as any;
    }

    return jwt.sign(payload, config.jwtSecret, options);
  } catch (error) {
    throw new Error(`Failed to sign token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'school-management-system',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error(`Failed to verify token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
