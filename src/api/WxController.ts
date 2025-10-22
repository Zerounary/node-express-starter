import { Controller, Get } from "@/utils/routeDecorators";
import { Request, Response } from "hyper-express";
import { WeChatH5Auth } from "@/utils/wx/h5auth";

// TODO: 请替换为你的AppID和AppSecret
const APP_ID = "wx72638e25f4a37963";
const APP_SECRET = "8ca931c5668ac3883dd4284212b6350c";
const YOUR_DOMAIN = "kcenter.jhtwl.com";

const wechatAuth = new WeChatH5Auth(APP_ID, APP_SECRET);

@Controller("/wx")
export default class WxController {
  /**
   * @summary H5微信授权登录 - 发起授权
   * @description 跳转到微信授权页面
   */
  @Get("/auth")
  public async redirectToWeChatAuth(req: Request, res: Response) {
    const redirectUri = `https://${YOUR_DOMAIN}/api/wx/callback`;
    const url = wechatAuth.getAuthorizationUrl(redirectUri);
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
      const userInfo = await wechatAuth.getUserInfo(code);

      // 在这里，你可以根据获取到的用户信息（userInfo）进行后续操作，
      // 比如：检查用户是否已存在于你的数据库中，如果不存在则创建新用户，然后生成一个token返回给前端，完成登录。

      res.json(userInfo);
    } catch (error) {
      console.error("Error handling WeChat callback:", error.message);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  }
}
