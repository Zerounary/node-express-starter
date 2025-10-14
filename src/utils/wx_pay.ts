import { Pay } from "node-easywechat";
import fs from "fs";
import https from "https";
import path from "path";
import crypto from "crypto";

const wx_pay_config = {
  appid: "wx72638e25f4a37963", // 公众号ID
  mchid: "1498998302", // 商户号
  key: "SCJHTwxpay202004159002562867fk6y", // APIv3密钥
};

/**
 * 生成v2签名
 * @param params 参与签名的参数
 * @returns sign
 */
export function signV2(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  let stringA = sortedKeys
    .filter(
      (key) =>
        params[key] !== undefined && params[key] !== null && params[key] !== ""
    )
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  stringA = `${stringA}&key=${wx_pay_config.key}`;
  const sign = crypto.createHash("md5").update(stringA).digest("hex").toUpperCase();
  return sign;
}

const easy_pay = new Pay({
  mch_id: wx_pay_config.mchid,
  v2_secret_key: wx_pay_config.key,
  certificate: "./cert/apiclient_cert.pem",
  private_key: "./cert/apiclient_key.pem",
});

const getBaseParams = () => {
  const nonce_str = Math.random().toString(36).substr(2, 15);
  return {
    mch_id: wx_pay_config.mchid,
    appid: wx_pay_config.appid,
    nonce_str,
  };
};

/**
 * 订单查询
 * @param params
 * @returns
 */
export async function orderquery(params: {
  out_trade_no: string;
  transaction_id?: string;
}) {
  let client = easy_pay.getClient();
  let res = await client.post("pay/orderquery", {
    data: {
      ...getBaseParams(),
      ...params,
    },
  });
  return res;
}

export async function sendredpack(params: {
  mch_billno: string;
  send_name: string;
  re_openid: string;
  total_amount: number;
  total_num: number;
  wishing: string;
  client_ip?: string;
  act_name: string;
  remark: string;
}) {
  let client = easy_pay.getClient();
  let data = {
    ...getBaseParams(),
    wxappid: wx_pay_config.appid,
    ...params,
  };
  let res = await client.post( "mmpaymkttransfers/sendredpack", {
    data,
    httpsAgent: new https.Agent({
      cert: fs.readFileSync("./cert/apiclient_cert.pem"),
      key: fs.readFileSync("./cert/apiclient_key.pem"),
      rejectUnauthorized: true,
    }),
  });
  return res;
}