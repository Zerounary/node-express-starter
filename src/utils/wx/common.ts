import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Builder, Parser } from "xml2js";

// --- 微信支付配置接口 ---
export interface IWxPayConfig {
  appid: string;
  send_name?: string;
  wishing?: string;
  mchid: string;
  key: string;
  certPath: string;
  keyPath: string;
}

export interface SendRedPacketParams {
  mch_billno: string; // 商户订单号 (商户侧唯一)
  re_openid: string; // 接收红包的用户openid
  total_amount: number; // 付款金额，单位为分
  send_name?: string; // 商户名称
  wishing?: string; // 红包祝福语
  act_name?: string; // 活动名称
  remark?: string; // 备注信息
  scene_id?: string; // 场景id，非必填
}

// --- 微信支付配置 ---
export const wxPayConfig: IWxPayConfig = {
  appid: "wx72638e25f4a37963", // 您的公众号ID
  send_name: "科普奖励", // 发送者名称
  wishing: "感谢您的积极参与", // 红包祝福语
  mchid: "1498998302", // 您的商户号
  key: "SCJHTwxpay202004159002562867fk6y", // 您的APIv2密钥
  certPath: path.resolve(process.cwd(), "cert/apiclient_cert.pem"),
  keyPath: path.resolve(process.cwd(), "cert/apiclient_key.pem"),
};

/**
 * 将JS对象转换为XML字符串
 */
function objectToXml(obj: Record<string, any>): string {
  const builder = new Builder({ rootName: "xml", cdata: true, headless: true });
  return builder.buildObject(obj);
}

/**
 * 将XML字符串解析为JS对象
 */
async function xmlToObject(xml: string): Promise<any> {
  const parser = new Parser({ explicitArray: false, trim: true });
  const result = await parser.parseStringPromise(xml);
  return result.xml;
}

export class WxPayV2 {
  private config: IWxPayConfig;

  constructor(config: IWxPayConfig) {
    this.config = config;
  }

  /**
   * 生成微信支付v2签名
   */
  private signV2(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys
      .filter(
        (key) =>
          params[key] !== undefined &&
          params[key] !== null &&
          params[key] !== ""
      )
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    const stringSignTemp = `${stringA}&key=${this.config.key}`;
    return crypto
      .createHash("md5")
      .update(stringSignTemp)
      .digest("hex")
      .toUpperCase();
  }

  /**
   * 通用的微信支付V2接口请求函数 (POST)
   */
  public async post(
    endpoint: string,
    params: Record<string, any>,
    useCert: boolean = false
  ) {
    const url = `https://api.mch.weixin.qq.com/${endpoint}`;
    const requestData: Record<string, any> = {
      ...params,
      mch_id: this.config.mchid,
      nonce_str: crypto.randomBytes(16).toString("hex"),
    };
    requestData.sign = this.signV2(requestData);
    const xmlData = objectToXml(requestData);
    const axiosConfig: { headers: any; httpsAgent?: any } = {
      headers: { "Content-Type": "text/xml" },
    };
    if (useCert) {
      axiosConfig.httpsAgent = new (require("https").Agent)({
        cert: fs.readFileSync(this.config.certPath),
        key: fs.readFileSync(this.config.keyPath),
        rejectUnauthorized: true,
      });
    }
    try {
      const response = await axios.post(url, xmlData, axiosConfig);
      const result = await xmlToObject(response.data);
      if (
        result.return_code === "SUCCESS" &&
        result.result_code === "SUCCESS"
      ) {
        return { success: true, data: result };
      } else {
        return {
          success: false,
          error: {
            return_msg: result.return_msg,
            err_code: result.err_code,
            err_code_des: result.err_code_des,
          },
        };
      }
    } catch (error: any) {
      console.error(`请求微信接口 ${endpoint} 失败:`, error);
      return {
        success: false,
        error: { message: error.message, data: error.response?.data },
      };
    }
  }

  /**
   * 发送微信支付普通现金红包
   * @param params 红包参数
   * @returns 微信支付接口返回的结果
   */
  public async sendRedPacket(params: SendRedPacketParams) {
    const requestParams = {
      wxappid: this.config.appid, // Red packet API uses `wxappid`
      total_num: 1,
      client_ip:  "",
      act_name: this.config?.send_name, // 活动名称
      remark: "", // 备注
      send_name: this.config?.send_name,
      wishing: this.config?.wishing,
      ...params,
    };
    return await this.post("mmpaymkttransfers/sendredpack", requestParams, true);
  }
}