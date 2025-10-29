import { Controller, Get, Post } from "@/utils/routeDecorators";
import { Request, Response } from "hyper-express";
import { WeChatH5Auth } from "@/utils/wx/h5auth";
import Member from "@/db/models/Member";
import AuthService from "@/services/AuthService";

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
    // TODO 认证时按租户ID进行归属
    const tenantId: string = (req.query?.tenantId as string) || '1';
    const redirectUri = `https://${YOUR_DOMAIN}/api/wx/callback`;
    const url = wechatAuth.getAuthorizationUrl(redirectUri, tenantId);
    res.redirect(url);
  }

  /**
   * @summary H5微信授权登录 - 回调
   * @description 接收微信授权后返回的code，并获取用户信息
   */
  @Get("/callback")
  public async handleWeChatCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    const tenantId = req.query.state as string;
    if (!code) {
      return res.status(400).json({ error: "Code is missing" });
    }

    try {
      const userInfo = await wechatAuth.getUserInfoFromCode(code);
      const openid = userInfo.openid;
      const nickname = userInfo.nickname;
      const sex = userInfo.sex;
      const headimgurl = userInfo.headimgurl;

      // 在这里，你可以根据获取到的用户信息（userInfo）进行后续操作，
      // 比如：检查用户是否已存在于你的数据库中，如果不存在则创建新用户，然后生成一个token返回给前端，完成登录。
      let [member] = await Member.findOrCreate({
        where: {openid},
        defaults: { openid, tenantId, nickname, sex, headimgurl }
      })

      const token = AuthService.generateVipToken(member);

      res.json({
        id: member.id,
        tenantId: member.tenantId,
        openid: member.openid,
        headimgurl: member.headimgurl,
        sex: member.sex,
        nickname: member.nickname,
        token
      });
    } catch (error) {
      console.error("Error handling WeChat callback:", error.message);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  }

  /**
   * @summary 批量获取用户信息
   * @description 根据 openid 列表批量获取用户信息
   */
  @Post("/users")
  public async batchGetUserInfo(req: Request, res: Response) {
    const { openids } = await req.json();

    if (!Array.isArray(openids) || openids.length === 0) {
      return res.status(400).json({ error: "openids must be a non-empty array" });
    }

    try {
      const userInfoList = await wechatAuth.batchGetUserInfo(openids);
      res.json(userInfoList);
    } catch (error) {
      console.error("Error batch getting user info:", error.message);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  }
}
