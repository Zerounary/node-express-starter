import { signSyc, verifySync } from '@/utils/protocol';
import User from '../db/models/User';
import Member from '@/db/models/Member';

class AuthService {
  /**
   * 根据后台用户信息 生成后台用户Token
   * @param user 后台用户 users 表的数据
   * @returns 
   */
  public generateToken(user: User, tableName = 'users'): string {
    const payload = {
      id: user.id,
      tableName,
      tenantId: user.tenantId,
    };
    return signSyc(payload);
  }

  /**
   * 校验Token 是否为后台的合法Token
   * @param token 后台Token
   * @returns 
   */
  public verifyToken(token: string): any {
    try {
      return verifySync(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * 
   * @param  
   * @returns 
   */
  public generateVipToken(member: Member): string {
    const payload = {
      id: member.id,
      tableName: 'members',
      username: member.username,
      tenantId: member.tenantId,
    };
    return signSyc(payload);
  }

}

export default new AuthService(); 