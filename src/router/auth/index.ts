import AuthService from '../../services/AuthService';
import { fail } from '../api';

const NO_AUTH = process.env.NODE_ENV === 'development';
const ALLOWED_PATHS = [
  '/api/demo/*',
  '/api/auth/login',
  '/api/auth/register',
  '/api/tenants/quick-create',
];

const ALLOWED_PATHS_REGEX = ALLOWED_PATHS.map(path => {
  if (path.endsWith('/*')) {
    return new RegExp(`^${path.slice(0, -2)}(/.*)?$`);
  }
  return new RegExp(`^${path}$`);
});

export const authMiddleware = (req, res, next) => {
  const isPathAllowed = ALLOWED_PATHS_REGEX.some(pattern => pattern.test(req.path));

  if (NO_AUTH || isPathAllowed) {
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