import AuthService from '../../services/AuthService';
import { fail } from '../api';

const NO_AUTH = process.env.NODE_ENV === 'development';
const ALLOWED_PATHS = [
  '/api/users/login',
  '/api/users/register'
];

export const authMiddleware = (req, res, next) => {
  if (NO_AUTH || ALLOWED_PATHS.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(fail('Unauthorized'));
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json(fail('Unauthorized: Invalid token'));
  }

  req.user = decoded;
  next();
};