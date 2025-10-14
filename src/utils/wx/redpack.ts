import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Builder, Parser } from 'xml2js';

// --- 微信支付配置 ---
// 建议将这些敏感信息移至环境变量或配置文件中
const wxPayConfig = {
  appid: "wx72638e25f4a37963", // 您的公众号ID
  mchid: "1498998302",       // 您的商户号
  key: "SCJHTwxpay202004159002562867fk6y", // 您的APIv2密钥
  certPath: path.resolve(process.cwd(), "cert/apiclient_cert.pem"),
  keyPath: path.resolve(process.cwd(), "cert/apiclient_key.pem"),
};

/**
 * 生成微信支付v2签名
 * @param params 参与签名的参数对象
 * @param apiKey 商户API密钥
 * @returns MD5签名
 */
function signV2(params: Record<string, any>, apiKey: string): string {
  const sortedKeys = Object.keys(params).sort();
  
  const stringA = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  
  const sign = crypto
    .createHash('md5')
    .update(stringSignTemp)
    .digest('hex')
    .toUpperCase();
    
  return sign;
}

/**
 * 将JS对象转换为XML字符串
 * @param obj JS对象
 * @returns XML字符串
 */
function objectToXml(obj: Record<string, any>): string {
  const builder = new Builder({ rootName: 'xml', cdata: true, headless: true });
  return builder.buildObject(obj);
}

/**
 * 将XML字符串解析为JS对象
 * @param xml XML字符串
 * @returns 解析后的JS对象
 */
async function xmlToObject(xml: string): Promise<any> {
  const parser = new Parser({ explicitArray: false, trim: true });
  const result = await parser.parseStringPromise(xml);
  return result.xml;
}

// --- 发送普通现金红包接口 ---

interface SendRedPacketParams {
  mch_billno: string;      // 商户订单号 (商户侧唯一)
  send_name: string;       // 商户名称
  re_openid: string;       // 接收红包的用户openid
  total_amount: number;    // 付款金额，单位为分
  total_num: number;       // 红包发放总人数，普通红包固定为1
  wishing: string;         // 红包祝福语
  client_ip: string;       // 调用接口的机器Ip地址
  act_name: string;        // 活动名称
  remark: string;          // 备注信息
  scene_id?: string;      // 场景id，非必填
}

/**
 * 发送微信支付普通现金红包
 * @param params 红包参数
 * @returns 微信支付接口返回的结果
 */
export async function sendRedPacket(params: SendRedPacketParams) {
  const url = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack';

  const requestData: Record<string, any> = {
    ...params,
    wxappid: wxPayConfig.appid,
    mch_id: wxPayConfig.mchid,
    nonce_str: crypto.randomBytes(16).toString('hex'), // 随机字符串
  };

  // 生成签名并添加到请求数据中
  requestData.sign = signV2(requestData, wxPayConfig.key);

  // 将请求数据转换为XML格式
  const xmlData = objectToXml(requestData);

  // 创建HTTPS Agent，加载证书用于双向认证
  const httpsAgent = new (require('https').Agent)({
    cert: fs.readFileSync(wxPayConfig.certPath),
    key: fs.readFileSync(wxPayConfig.keyPath),
    rejectUnauthorized: true, // 确保验证微信支付的服务器证书
  });

  try {
    // 发送POST请求
    const response = await axios.post(url, xmlData, {
      headers: { 'Content-Type': 'text/xml' },
      httpsAgent,
    });

    // 解析微信返回的XML结果
    const result = await xmlToObject(response.data);

    // 判断业务是否成功
    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return { success: true, data: result };
    } else {
      // 返回业务失败的详细信息
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
    console.error('发送红包请求失败:', error);
    return {
      success: false,
      error: {
        message: error.message,
        // 如果有微信返回的错误数据，也一并返回
        data: error.response?.data,
      },
    };
  }
}