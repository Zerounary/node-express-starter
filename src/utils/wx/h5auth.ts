import axios from "axios";

export interface WechatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

export class WeChatH5Auth {
  private appId: string;
  private appSecret: string;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  public getAuthorizationUrl(redirectUri: string, state: string = "STATE"): string {
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.appId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
  }

  public async getUserInfo(code: string): Promise<WechatUserInfo> {
    const { access_token, openid } = await this.getAccessToken(code);
    const userInfoResponse = await axios.get(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
    );
    return userInfoResponse.data;
  }

  private async getAccessToken(code: string): Promise<{ access_token: string; openid: string }> {
    const response = await axios.get(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`
    );

    if (response.data.errcode) {
      throw new Error(`Failed to get access_token: ${response.data.errmsg}`);
    }

    return response.data;
  }
}
