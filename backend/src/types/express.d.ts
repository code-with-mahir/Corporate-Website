import { User } from './models';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        school_id?: string;
      };
      school?: {
        id: string;
        name: string;
        code: string;
      };
      schoolId?: string;
    }
  }
}

export {};
