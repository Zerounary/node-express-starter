import AuthService from '../../services/AuthService';
import { fail } from '../api';

const NO_AUTH = process.env.NODE_ENV === 'development';
const ALLOWED_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/tenants/quick-create',
];

export const authMiddleware = (req, res, next) => {
  if (NO_AUTH || ALLOWED_PATHS.includes(req.path)) {
    // For development, simulate a default user/tenant if none is present
    if (NO_AUTH && !req.user) {
        req.user = { id: 1, username: 'dev-user', tenantId: 1 };
    }
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(fail('Unauthorized'));
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthService.verifyToken(token);
  if (!decoded || !decoded.tenantId) {
    return res.status(401).json(fail('Unauthorized: Invalid token content'));
  }

  req.user = decoded;
  next();
};