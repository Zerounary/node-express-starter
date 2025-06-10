import { signSyc, verifySync } from '@/utils/protocol';
import User from '../db/models/User';

class AuthService {
  public generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
    };
    return signSyc(payload);
  }

  public verifyToken(token: string): any {
    try {
      return verifySync(token);
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService(); 