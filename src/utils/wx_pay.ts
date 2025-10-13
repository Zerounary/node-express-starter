import WxPay from "wechatpay-node-v3"; // 支持使用require
import fs from "fs";
import request from "superagent";
import { jsonToXml } from "./xml";

import { Pay } from "node-easywechat";

const wx_pay_config = {
  appid: "wx72638e25f4a37963", // 公众号ID
  mchid: "1498998302", // 商户号
  key: "SCJHTwxpay202004159002562867fk6y", // APIv3密钥
};

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
  client_ip: string;
  act_name: string;
  remark: string;
}) {
  let client = easy_pay.getClient();
  let res = await client.post("mmpaymkttransfers/sendredpack", {
    data: {
      ...getBaseParams(),
      wxappid: wx_pay_config.appid,
      ...params,
    },
  });
  return res;
}
