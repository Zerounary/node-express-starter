import { User } from '../db/models/User';

declare global {
  namespace Express {
    export interface Request {
      user?: import('../db/models/User').default;
    }
  }
} 