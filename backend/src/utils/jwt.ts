import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  school_id?: string;
}

export const signToken = (
  payload: JwtPayload,
  expiresIn: string = '7d'
): string => {
  try {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn,
      issuer: 'school-management-system',
    });
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
