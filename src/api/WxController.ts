import { Controller, Get } from "@/utils/routeDecorators";
import { Request, Response } from "hyper-express";
import axios from "axios";

// TODO: 请替换为你的AppID和AppSecret
const APP_ID = "wx72638e25f4a37963";
const APP_SECRET = "8ca931c5668ac3883dd4284212b6350c";
const YOUR_DOMAIN = "kcenter.jhtwl.com";

@Controller("/wx")
export default class WxController {
  /**
   * @summary H5微信授权登录 - 发起授权
   * @description 跳转到微信授权页面
   */
  @Get("/auth")
  public async redirectToWeChatAuth(req: Request, res: Response) {
    // TODO: 请将 YOUR_DOMAIN 替换为你的H5页面所在的域名
    const redirectUri = encodeURIComponent(`https://${YOUR_DOMAIN}/api/wx/callback`);
    const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;
    res.redirect(url);
  }

  /**
   * @summary H5微信授权登录 - 回调
   * @description 接收微信授权后返回的code，并获取用户信息
   */
  @Get("/callback")
  public async handleWeChatCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ error: "Code is missing" });
    }

    try {
      // 1. 通过 code 换取 access_token 和 openid
      const tokenResponse = await axios.get(
        `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${APP_ID}&secret=${APP_SECRET}&code=${code}&grant_type=authorization_code`
      );
      const { access_token, openid } = tokenResponse.data;

      if (!access_token || !openid) {
        return res.status(500).json({ error: "Failed to get access_token or openid", data: tokenResponse.data });
      }

      // 2. 通过 access_token 和 openid 获取用户信息
      const userInfoResponse = await axios.get(
        `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
      );
      const userInfo = userInfoResponse.data;

      // 在这里，你可以根据获取到的用户信息（userInfo）进行后续操作，
      // 比如：检查用户是否已存在于你的数据库中，如果不存在则创建新用户，然后生成一个token返回给前端，完成登录。

      res.json(userInfo);
    } catch (error) {
      console.error("Error handling WeChat callback:", error.response ? error.response.data : error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
