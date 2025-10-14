import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Builder, Parser } from 'xml2js';

// --- 微信支付配置 ---
export const wxPayConfig = {
  appid: "wx72638e25f4a37963", // 您的公众号ID
  mchid: "1498998302",       // 您的商户号
  key: "SCJHTwxpay202004159002562867fk6y", // 您的APIv2密钥
  certPath: path.resolve(process.cwd(), "cert/apiclient_cert.pem"),
  keyPath: path.resolve(process.cwd(), "cert/apiclient_key.pem"),
};

/**
 * 生成微信支付v2签名
 */
function signV2(params: Record<string, any>, apiKey: string): string {
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .map(key => `${key}=${params[key]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
}

/**
 * 将JS对象转换为XML字符串
 */
function objectToXml(obj: Record<string, any>): string {
  const builder = new Builder({ rootName: 'xml', cdata: true, headless: true });
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

/**
 * 通用的微信支付V2接口请求函数 (POST)
 */
export async function postV2(endpoint: string, params: Record<string, any>, useCert: boolean = false) {
  const url = `https://api.mch.weixin.qq.com/${endpoint}`;
  const requestData: Record<string, any> = {
    ...params,
    mch_id: wxPayConfig.mchid,
    nonce_str: crypto.randomBytes(16).toString('hex'),
  };
  requestData.sign = signV2(requestData, wxPayConfig.key);
  const xmlData = objectToXml(requestData);
  const axiosConfig: { headers: any; httpsAgent?: any } = {
    headers: { 'Content-Type': 'text/xml' },
  };
  if (useCert) {
    axiosConfig.httpsAgent = new (require('https').Agent)({
      cert: fs.readFileSync(wxPayConfig.certPath),
      key: fs.readFileSync(wxPayConfig.keyPath),
      rejectUnauthorized: true,
    });
  }
  try {
    const response = await axios.post(url, xmlData, axiosConfig);
    const result = await xmlToObject(response.data);
    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
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