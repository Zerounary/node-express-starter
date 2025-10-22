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

interface AccessToken {
  token: string;
  expiresAt: number;
}

export class WeChatH5Auth {
  private appId: string;
  private appSecret: string;
  private accessToken: AccessToken | null = null;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  // ==================================================================================================
  // H5 授权登录 (OAuth)
  // ==================================================================================================

  public getAuthorizationUrl(redirectUri: string, state: string = "STATE"): string {
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.appId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
  }

  public async getUserInfoFromCode(code: string): Promise<WechatUserInfo> {
    const { access_token, openid } = await this.getOAuthAccessToken(code);
    const userInfoResponse = await axios.get(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
    );
    return userInfoResponse.data;
  }

  private async getOAuthAccessToken(code: string): Promise<{ access_token: string; openid: string }> {
    const response = await axios.get(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`
    );

    if (response.data.errcode) {
      throw new Error(`Failed to get oauth access_token: ${response.data.errmsg}`);
    }

    return response.data;
  }

  // ==================================================================================================
  // 全局 AccessToken & 用户管理
  // ==================================================================================================

  private async refreshAccessToken(): Promise<AccessToken> {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
    const response = await axios.get(url);

    if (response.data.errcode) {
      throw new Error(`Failed to get global access_token: ${response.data.errmsg}`);
    }

    const { access_token, expires_in } = response.data;
    // 提前 5 分钟过期，以防止网络延迟等问题
    const expiresAt = Date.now() + (expires_in - 300) * 1000;
    this.accessToken = { token: access_token, expiresAt };
    return this.accessToken;
  }

  public async getAccessToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.accessToken.expiresAt) {
      await this.refreshAccessToken();
    }
    return this.accessToken!.token;
  }

  /**
   * 未关注：
   * 
   * [
	{
		"subscribe": 0,
		"openid": "oarAv51ohZCvemFDyDIiRerCVRk4",
		"tagid_list": []
	}
]

    关注：
    [
	{
		"subscribe": 1,
		"openid": "oarAv51ohZCvemFDyDIiRerCVRk4",
		"nickname": "",
		"sex": 0,
		"language": "zh_CN",
		"city": "",
		"province": "",
		"country": "",
		"headimgurl": "",
		"subscribe_time": 1761098210,
		"unionid": "oLTamjqYEZVucSqAnuedIWzAnh3g",
		"remark": "",
		"groupid": 0,
		"tagid_list": [],
		"subscribe_scene": "ADD_SCENE_QR_CODE",
		"qr_scene": 0,
		"qr_scene_str": ""
	}
]

   * @param openids opendids 数组
   * @returns 
   */
  public async batchGetUserInfo(openids: string[]): Promise<WechatUserInfo[]> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=${accessToken}`;
    const userList = openids.map(openid => ({ openid, lang: 'zh_CN' }));

    const response = await axios.post(url, { user_list: userList });

    if (response.data.errcode) {
      throw new Error(`Failed to batch get user info: ${response.data.errmsg}`);
    }

    return response.data.user_info_list;
  }
}
